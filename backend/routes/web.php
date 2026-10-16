<?php

use Illuminate\Support\Facades\Route;

/*
| The React SPA is built into public/app (see docs/FRONTEND-HANDOVER.md).
| Every non-API path returns its index.html so client-side routing works on refresh.
*/
Route::get('/{any?}', function () {
    $index = public_path('app/index.html');
    if (! is_file($index)) {
        return response()->json(['name' => config('app.name'), 'api' => url('/api/v1'), 'ui' => 'not built yet']);
    }

    return response()->file($index, ['Cache-Control' => 'no-cache, no-store, must-revalidate', 'X-Robots-Tag' => 'noindex']);
})->where('any', '^(?!api/|sanctum/|up$).*$');
