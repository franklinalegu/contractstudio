<?php
declare(strict_types=1);

/* Contract Studio — server-side password gate.
   The password hash lives in a SQLite database outside the web root. */

ini_set("display_errors", "0");
ini_set("log_errors", "1");
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, max-age=0");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: no-referrer");

$DB_FILE = getenv("PORTFOLIO_DB") ?: getenv("CONTRACT_DB") ?: "/home/u808504299/portfolio-data/contract-studio.sqlite";
const SESSION_NAME = "mjb_contract_sid";

function out(int $code, array $data): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function payload(): array {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw ?: "", true);
    return is_array($data) ? $data : [];
}

$https = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
    || (($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "") === "https");

session_name(SESSION_NAME);
session_set_cookie_params([
    "lifetime" => 0,
    "path" => "/",
    "domain" => "",
    "secure" => $https,
    "httponly" => true,
    "samesite" => "Lax",
]);
session_start();

$action = (string)($_GET["action"] ?? "status");
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "POST") {
    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";
    if ($origin !== "") {
        $host = parse_url($origin, PHP_URL_HOST);
        if (!hash_equals((string)($_SERVER["HTTP_HOST"] ?? ""), (string)$host)) {
            out(403, ["ok" => false, "error" => "Origin not allowed."]);
        }
    }
}

if (!is_file($DB_FILE)) {
    out(500, ["ok" => false, "error" => "Studio database unavailable."]);
}

try {
    $pdo = new PDO("sqlite:" . $DB_FILE, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $pdo->exec("PRAGMA journal_mode = WAL");
    $pdo->exec("PRAGMA busy_timeout = 5000");
} catch (Throwable $e) {
    error_log("Contract auth DB: " . $e->getMessage());
    out(500, ["ok" => false, "error" => "Studio database unavailable."]);
}

if ($action === "status") {
    $row = $pdo->query("SELECT admin_user FROM settings WHERE id = 1")->fetch();
    out(200, [
        "ok" => true,
        "configured" => (bool)$row,
        "user" => $row["admin_user"] ?? "",
        "authenticated" => !empty($_SESSION["auth"]),
    ]);
}

if ($action === "login") {
    if ($method !== "POST") out(405, ["ok" => false, "error" => "Method not allowed."]);

    $ip = (string)($_SERVER["REMOTE_ADDR"] ?? "unknown");
    $now = time();
    $st = $pdo->prepare("SELECT count, until FROM attempts WHERE ip = ?");
    $st->execute([$ip]);
    $a = $st->fetch();
    if ($a && (int)$a["until"] > $now) {
        out(429, ["ok" => false, "error" => "Too many attempts.", "retryAfter" => (int)$a["until"] - $now]);
    }

    $in = payload();
    $user = trim((string)($in["username"] ?? ""));
    $pass = (string)($in["password"] ?? "");
    $row = $pdo->query("SELECT admin_user, password_hash FROM settings WHERE id = 1")->fetch();

    $ok = $row
        && hash_equals(strtolower($row["admin_user"]), strtolower($user))
        && password_verify($pass, $row["password_hash"]);

    if ($ok) {
        $pdo->prepare("DELETE FROM attempts WHERE ip = ?")->execute([$ip]);
        session_regenerate_id(true);
        $_SESSION["auth"] = true;
        $_SESSION["user"] = $row["admin_user"];
        out(200, ["ok" => true, "user" => $row["admin_user"]]);
    }

    $count = ($a ? (int)$a["count"] : 0) + 1;
    $until = $count >= 5 ? $now + min(30 * (2 ** ($count - 5)), 900) : 0;
    $pdo->prepare(
        "INSERT INTO attempts(ip, count, until, updated_at) VALUES(?, ?, ?, ?)
         ON CONFLICT(ip) DO UPDATE SET count = excluded.count, until = excluded.until, updated_at = excluded.updated_at"
    )->execute([$ip, $count, $until, $now]);

    usleep(250000);
    out(401, [
        "ok" => false,
        "error" => "Wrong username or password.",
        "retryAfter" => max(0, $until - $now),
    ]);
}

if ($action === "logout") {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $p = session_get_cookie_params();
        setcookie(session_name(), "", time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
    }
    session_destroy();
    out(200, ["ok" => true]);
}

if ($action === "change-password") {
    if (empty($_SESSION["auth"])) out(401, ["ok" => false, "error" => "Sign in first."]);
    if ($method !== "POST") out(405, ["ok" => false, "error" => "Method not allowed."]);

    $in = payload();
    $pass = (string)($in["password"] ?? "");
    if (strlen($pass) < 8) out(422, ["ok" => false, "error" => "Password needs at least 8 characters."]);

    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE settings SET password_hash = ?, updated_at = ? WHERE id = 1")
        ->execute([$hash, gmdate("c")]);
    out(200, ["ok" => true]);
}

out(404, ["ok" => false, "error" => "Unknown action."]);
