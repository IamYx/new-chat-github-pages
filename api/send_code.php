<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'message' => '只支持 POST'], 405);
}

$data = read_json();
$phone = require_phone((string)($data['phone'] ?? ''));
$code = random_code();
$ttl = (int) config()['sms']['code_ttl_seconds'];

$stmt = db()->prepare('INSERT INTO sms_codes (phone, code_hash, expires_at, created_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), NOW())');
$stmt->execute([$phone, hash_code($code), $ttl]);

// 生产环境请在这里接入短信服务商，例如阿里云、腾讯云短信。
if ((bool) config()['sms']['dev_mode']) {
    json_response([
        'ok' => true,
        'message' => '验证码已生成，开发模式直接返回',
        'devCode' => $code,
        'expiresIn' => $ttl,
    ]);
}

json_response([
    'ok' => true,
    'message' => '验证码已发送',
    'expiresIn' => $ttl,
]);
