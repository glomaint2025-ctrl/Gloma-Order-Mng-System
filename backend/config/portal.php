<?php

return [
    // Shown on bills and emails.
    'company_name' => env('PORTAL_COMPANY_NAME', 'Gloma International'),
    'privacy_notice_url' => env('PORTAL_PRIVACY_URL'),

    'sms' => [
        // log | dialog | textlk
        'driver' => env('SMS_DRIVER', 'log'),
        // LKR per SMS segment (D45). Used to bill shops.
        'cost_per_segment' => env('SMS_COST_PER_SEGMENT', '0.64'),
        // Dialog eSMS "message via URL" API, the same account as GlomaLoans (D58).
        'dialog' => [
            'endpoint' => env('DIALOG_ESMS_ENDPOINT', 'https://e-sms.dialog.lk/api/v1/message-via-url'),
            'api_key' => env('DIALOG_ESMS_API_KEY', ''),
            'sender_id' => env('DIALOG_ESMS_SENDER_ID', ''),
        ],
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
