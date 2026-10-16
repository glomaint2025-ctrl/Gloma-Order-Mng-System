<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Couriers\Models\Courier;
use Illuminate\Database\Seeder;

/**
 * D20 couriers. Tracking URL patterns are ASSUMED (SPIKE-2) and editable in Admin → Couriers.
 * Existing rows are not overwritten, so admin fixes survive re-seeding.
 */
class CouriersSeeder extends Seeder
{
    public function run(): void
    {
        $couriers = [
            ['code' => 'koombiyo', 'name' => 'Koombiyo Delivery', 'tracking_url_template' => 'https://koombiyodelivery.lk/Track/track_id?id={tracking}'],
            ['code' => 'fardar', 'name' => 'Fardar Express', 'tracking_url_template' => 'https://www.fardardomestic.com/track?waybill={tracking}'],
            ['code' => 'royal', 'name' => 'Royal Express', 'tracking_url_template' => 'https://royalexpress.lk/track?tracking={tracking}'],
        ];

        foreach ($couriers as $courier) {
            Courier::query()->firstOrCreate(['code' => $courier['code']], $courier);
        }
    }
}
