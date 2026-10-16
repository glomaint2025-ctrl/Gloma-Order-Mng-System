<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * A broken business rule. Rendered as {message, code} with HTTP 409 (or the given status).
 */
class BusinessRuleException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 409,
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode], $this->status);
    }
}
