<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

try {
    db()->query('SELECT 1');
} catch (Throwable $error) {
    json_response(['ok' => false, 'message' => '数据库不可用'], 500);
}

json_response([
    'ok' => true,
    'message' => '接口可用',
    'php' => PHP_VERSION,
]);
