<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$token = (string)($_GET['token'] ?? '');
if ($token === '' || $token !== (string)(config()['install_token'] ?? '')) {
    json_response(['ok' => false, 'message' => '无权初始化'], 403);
}

$schema = file_get_contents(__DIR__ . '/schema.sql');
if ($schema === false) {
    json_response(['ok' => false, 'message' => '找不到 schema.sql'], 500);
}

try {
    db()->exec($schema);
} catch (Throwable $error) {
    json_response(['ok' => false, 'message' => '数据库初始化失败', 'detail' => $error->getMessage()], 500);
}

json_response(['ok' => true, 'message' => '数据库初始化完成']);
