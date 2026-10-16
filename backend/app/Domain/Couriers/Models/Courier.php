<?php

declare(strict_types=1);

namespace App\Domain\Couriers\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A courier company (Koombiyo, Fardar, Royal). Global, not tenant-owned.
 *
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string $tracking_url_template e.g. https://example.lk/track?id={tracking}
 * @property bool $is_active
 */
class Courier extends Model
{
    protected $fillable = ['code', 'name', 'tracking_url_template', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
