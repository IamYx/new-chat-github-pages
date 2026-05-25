<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(['ok' => false, 'message' => '请求体不是有效 JSON'], 400);
    }

    return $data;
}

function config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        json_response(['ok' => false, 'message' => '缺少 api/config.php 配置文件'], 500);
    }

    $config = require $path;
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = config()['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'],
        $db['port'],
        $db['database'],
        $db['charset']
    );

    try {
        $pdo = new PDO($dsn, $db['username'], $db['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (Throwable $error) {
        json_response(['ok' => false, 'message' => '数据库连接失败'], 500);
    }

    return $pdo;
}

function require_phone(string $phone): string
{
    $phone = trim($phone);
    if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
        json_response(['ok' => false, 'message' => '手机号格式不正确'], 422);
    }
    return $phone;
}

function random_code(): string
{
    return (string) random_int(100000, 999999);
}

function hash_code(string $code): string
{
    return password_hash($code, PASSWORD_DEFAULT);
}

function verify_code_hash(string $code, string $hash): bool
{
    return password_verify($code, $hash);
}

function create_session_token(): string
{
    return bin2hex(random_bytes(32));
}

function yunxin_checksum(string $appSecret, string $nonce, string $curTime): string
{
    return sha1($appSecret . $nonce . $curTime);
}

function yunxin_request(string $path, array $params): array
{
    $yunxin = config()['yunxin'];
    $nonce = bin2hex(random_bytes(8));
    $curTime = (string) time();
    $url = 'https://api.netease.im' . $path;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'AppKey: ' . $yunxin['app_key'],
            'Nonce: ' . $nonce,
            'CurTime: ' . $curTime,
            'CheckSum: ' . yunxin_checksum($yunxin['app_secret'], $nonce, $curTime),
            'Content-Type: application/x-www-form-urlencoded;charset=utf-8',
        ],
    ]);

    $body = curl_exec($ch);
    $error = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $status < 200 || $status >= 300) {
        json_response(['ok' => false, 'message' => '云信接口请求失败', 'detail' => $error], 502);
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        json_response(['ok' => false, 'message' => '云信接口返回异常'], 502);
    }

    return $data;
}

function ensure_yunxin_account(string $phone): array
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, phone, yunxin_accid, yunxin_token FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if ($user && $user['yunxin_accid'] && $user['yunxin_token']) {
        return $user;
    }

    $accid = 'u_' . substr(hash('sha256', $phone), 0, 24);
    $token = bin2hex(random_bytes(20));
    $name = substr($phone, 0, 3) . '****' . substr($phone, -4);

    $result = yunxin_request('/nimserver/user/create.action', [
        'accid' => $accid,
        'token' => $token,
        'name' => $name,
    ]);

    if (($result['code'] ?? 0) !== 200 && ($result['code'] ?? 0) !== 414) {
        json_response(['ok' => false, 'message' => '创建云信账号失败', 'yunxin' => $result], 502);
    }

    if (!$user) {
        $stmt = $pdo->prepare('INSERT INTO users (phone, yunxin_accid, yunxin_token, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
        $stmt->execute([$phone, $accid, $token]);
        $id = (string) $pdo->lastInsertId();
    } else {
        $stmt = $pdo->prepare('UPDATE users SET yunxin_accid = ?, yunxin_token = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$accid, $token, $user['id']]);
        $id = $user['id'];
    }

    return [
        'id' => $id,
        'phone' => $phone,
        'yunxin_accid' => $accid,
        'yunxin_token' => $token,
    ];
}
