<?php
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'your_database',
        'username' => 'your_username',
        'password' => 'your_password',
        'charset' => 'utf8mb4',
    ],
    'yunxin' => [
        'app_key' => 'your_yunxin_app_key',
        'app_secret' => 'your_yunxin_app_secret',
    ],
    'sms' => [
        'dev_mode' => true,
        'code_ttl_seconds' => 300,
    ],
];
