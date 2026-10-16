<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Users\Perm;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Idempotent. Staff roles (phase 3) will be added here as new rows. */
class RolesSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (Perm::all() as $name) {
            Permission::findOrCreate($name, 'web');
        }

        Role::findOrCreate(Perm::ROLE_ADMIN, 'web')->syncPermissions(Perm::all());
        Role::findOrCreate(Perm::ROLE_OWNER, 'web')->syncPermissions(Perm::owner());

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
