<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Shop;

use App\Domain\Orders\Documents\OrderDocuments;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Models\Shop;
use App\Http\Controllers\Controller;
use App\Support\BusinessRuleException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Invoice and label PDFs, single or bulk (D23). */
final class DocumentController extends Controller
{
    public function single(Shop $shop, Order $order, string $type, OrderDocuments $docs): Response
    {
        if ($type === 'label' && ($order->isWalkIn() || $order->status === OrderStatus::Cancelled)) {
            throw new BusinessRuleException('invalid_transition', 'This order has no delivery label.');
        }

        return $this->pdf($type === 'label' ? $docs->label(collect([$order])) : $docs->invoice(collect([$order])), "{$type}-{$order->number}.pdf");
    }

    /** POST {type: invoice|label, order_ids: [..]} → one PDF, one page per order. */
    public function bulk(Request $request, Shop $shop, OrderDocuments $docs): Response
    {
        $data = $request->validate([
            'type' => ['required', 'in:invoice,label'],
            'order_ids' => ['required', 'array', 'min:1', 'max:200'],
            'order_ids.*' => ['integer'],
        ]);

        $orders = Order::query()->whereIn('id', $data['order_ids'])->orderBy('id')->get();
        if ($data['type'] === 'label') {
            $orders = $orders->reject(fn (Order $o) => $o->isWalkIn() || $o->status === OrderStatus::Cancelled)->values();
        }
        if ($orders->isEmpty()) {
            throw new BusinessRuleException('nothing_to_print', 'None of the selected orders can be printed.', 422);
        }

        $pdf = $data['type'] === 'label' ? $docs->label($orders) : $docs->invoice($orders);

        return $this->pdf($pdf, "{$data['type']}s-".now()->format('Ymd-His').'.pdf');
    }

    private function pdf(string $content, string $filename): Response
    {
        return response($content, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }
}
