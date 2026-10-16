<?php

declare(strict_types=1);

namespace App\Domain\Audit\Services;

use App\Domain\Audit\Models\AuditLog;
use App\Domain\Shops\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;

final class AuditLogger
{
    private const HIDDEN = ['password', 'remember_token'];

    public function __construct(private readonly TenantContext $tenant) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function log(string $action, ?Model $subject = null, array $changes = [], ?int $shopId = null): AuditLog
    {
        $request = request();

        return AuditLog::create([
            'user_id' => $request->user()?->getAuthIdentifier(),
            'shop_id' => $shopId ?? $this->tenant->id() ?? ($subject?->getAttributes()['shop_id'] ?? null),
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'changes' => $changes === [] ? null : $this->scrub($changes),
            'ip' => $request->ip(),
        ]);
    }

    /** Log the dirty attributes of a model that is about to be (or was just) saved. */
    public function logModelChange(string $action, Model $model): AuditLog
    {
        $changes = [];
        foreach ($model->getChanges() as $key => $new) {
            if ($key === 'updated_at') {
                continue;
            }
            $changes[$key] = ['from' => $model->getOriginal($key), 'to' => $new];
        }

        return $this->log($action, $model, $changes);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function scrub(array $data): array
    {
        foreach (self::HIDDEN as $key) {
            if (array_key_exists($key, $data)) {
                $data[$key] = '***';
            }
        }

        return $data;
    }
}
