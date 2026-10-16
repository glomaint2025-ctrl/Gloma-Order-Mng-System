<?php

declare(strict_types=1);

namespace App\Support;

use App\Domain\Shops\Tenancy\TenantContext;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a CSV that opens cleanly in Excel: UTF-8 BOM (Sinhala/Tamil names survive) and
 * formula-injection protection (cells starting with = + - @ are prefixed with ').
 */
final class CsvExport
{
    /**
     * @param  list<string>  $headers
     * @param  iterable<array<int, scalar|null>>  $rows
     */
    public static function download(string $filename, array $headers, iterable $rows): StreamedResponse
    {
        // Rows are produced lazily while streaming, which happens AFTER the `tenant` middleware has cleared
        // the TenantContext. Re-apply the request's shop for the duration of the stream so the global
        // shop scope still holds (callers also filter by shop_id explicitly: defence in depth).
        $tenant = app(TenantContext::class);
        $shop = $tenant->shop();

        return response()->streamDownload(function () use ($headers, $rows, $tenant, $shop) {
            $previous = $tenant->shop();
            $tenant->set($shop);
            try {
                $out = fopen('php://output', 'w');
                if ($out === false) {
                    return;
                }
                fwrite($out, "\xEF\xBB\xBF");
                fputcsv($out, $headers, escape: '');
                foreach ($rows as $row) {
                    fputcsv($out, array_map(self::safe(...), $row), escape: '');
                }
                fclose($out);
            } finally {
                $tenant->set($previous);
            }
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }

    public static function safe(string|int|float|bool|null $value): string
    {
        $value = (string) $value;
        if ($value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) && ! is_numeric($value)) {
            return "'".$value;
        }

        return $value;
    }
}
