<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Production-safe reference data. Demo data only via DemoSeeder (local / UAT). */
    public function run(): void
    {
        $this->call([RolesSeeder::class, CouriersSeeder::class, TemplatesSeeder::class]);
    }
}
