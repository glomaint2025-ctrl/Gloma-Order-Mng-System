<?php

return [
    // Shown on bills and emails.
    'company_name' => env('PORTAL_COMPANY_NAME', 'Gloma International'),
    'privacy_notice_url' => env('PORTAL_PRIVACY_URL'),

    'sms' => [
        // log | textlk
        'driver' => env('SMS_DRIVER', 'log'),
        // LKR per SMS segment (Text.lk ~0.64, D45). Used to bill shops.
        'cost_per_segment' => env('SMS_COST_PER_SEGMENT', '0.64'),
        'textlk' => [
            'base_url' => env('TEXTLK_BASE_URL', 'https://app.text.lk'),
            'token' => env('TEXTLK_API_TOKEN', ''),
            'sender_id' => env('TEXTLK_SENDER_ID', ''),
        ],
    ],

    // Customers with no order for this many years are anonymised (PDPA retention; ASSUMED 5 years).
    'customer_retention_years' => (int) env('CUSTOMER_RETENTION_YEARS', 5),

    // Stock at or below this shows as "low stock" on dashboards.
    'low_stock_threshold' => (int) env('LOW_STOCK_THRESHOLD', 5),
];
