<?php

declare(strict_types=1);

namespace App\Domain\Orders\Documents;

use App\Domain\Orders\Models\Order;
use App\Domain\Shops\Models\Shop;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;

/**
 * Printed customer invoice and address label (D23). dompdf: pure PHP, works on shared hosting.
 */
final class OrderDocuments
{
    /** @param Collection<int, Order> $orders */
    public function invoice(Collection $orders): string
    {
        return $this->render('pdf.invoice', $orders, 'a5');
    }

    /** @param Collection<int, Order> $orders */
    public function label(Collection $orders): string
    {
        return $this->render('pdf.label', $orders, [0, 0, 288, 432]); // 4x6 inch
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @param  string|array<int, int>  $paper
     */
    private function render(string $view, Collection $orders, string|array $paper): string
    {
        $orders->each->loadMissing('items', 'paymentMethod', 'courierAccount.courier');
        $shops = Shop::query()->whereIn('id', $orders->pluck('shop_id'))->get()->keyBy('id');

        return Pdf::loadView($view, [
            'orders' => $orders,
            'shops' => $shops,
            'company' => config('portal.company_name'),
        ])->setPaper($paper)->output();
    }
}
