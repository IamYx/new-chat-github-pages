<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'message' => '只支持 POST'], 405);
}

$data = read_json();
$phone = require_phone((string)($data['phone'] ?? ''));
$code = trim((string)($data['code'] ?? ''));

if (!preg_match('/^\d{6}$/', $code)) {
    json_response(['ok' => false, 'message' => '验证码格式不正确'], 422);
}

$stmt = db()->prepare('SELECT id, code_hash FROM sms_codes WHERE phone = ? AND used_at IS NULL AND expires_at > NOW() ORDER BY id DESC LIMIT 1');
$stmt->execute([$phone]);
$row = $stmt->fetch();

if (!$row || !verify_code_hash($code, $row['code_hash'])) {
    json_response(['ok' => false, 'message' => '验证码错误或已过期'], 401);
}

db()->prepare('UPDATE sms_codes SET used_at = NOW() WHERE id = ?')->execute([$row['id']]);

$user = ensure_yunxin_account($phone);
$sessionToken = create_session_token();
db()->prepare('UPDATE users SET session_token = ?, updated_at = NOW() WHERE id = ?')->execute([$sessionToken, $user['id']]);

$yunxin = config()['yunxin'];

json_response([
    'ok' => true,
    'user' => [
        'phone' => substr($phone, 0, 3) . '****' . substr($phone, -4),
        'accid' => $user['yunxin_accid'],
    ],
    'im' => [
        'appKey' => $yunxin['app_key'],
        'account' => $user['yunxin_accid'],
        'token' => $user['yunxin_token'],
    ],
    'sessionToken' => $sessionToken,
]);
