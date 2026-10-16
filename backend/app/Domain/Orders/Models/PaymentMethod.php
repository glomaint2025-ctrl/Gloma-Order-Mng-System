<?php

declare(strict_types=1);

namespace App\Domain\Orders\Models;

use App\Domain\Orders\Enums\PaymentMethodKind;
use App\Domain\Shops\Tenancy\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

/**
 * Per-shop payment method (D38), e.g. "Cash on delivery", "Bank transfer", "Card".
 *
 * @property int $id
 * @property int $shop_id
 * @property string $name
 * @property PaymentMethodKind $kind
 * @property bool $requires_slip
 * @property bool $is_active
 */
class PaymentMethod extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'name', 'kind', 'requires_slip', 'is_active'];

    protected function casts(): array
    {
        return ['kind' => PaymentMethodKind::class, 'requires_slip' => 'boolean', 'is_active' => 'boolean'];
    }
}
