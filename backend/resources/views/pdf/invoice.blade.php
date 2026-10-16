<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #111; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    h1 { font-size: 16px; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 4px; border-bottom: 1px solid #ddd; text-align: left; }
    td.r, th.r { text-align: right; }
    .muted { color: #666; }
    .totals td { border: none; }
</style>
</head>
<body>
@foreach ($orders as $order)
    @php($shop = $shops[$order->shop_id])
    <div class="page">
        <h1>{{ $shop->name }}</h1>
        <div class="muted">{{ $shop->address }} {{ $shop->phone ? '· '.$shop->phone : '' }}</div>
        <p>
            <strong>Invoice {{ $order->number }}</strong><br>
            Date: {{ $order->created_at->format('Y-m-d H:i') }}<br>
            Payment: {{ $order->paymentMethod?->name }} ({{ $order->payment_status->label() }})
        </p>
        @if ($order->customer_name)
            <p>
                <strong>Bill to</strong><br>
                {{ $order->customer_name }}<br>
                @if ($order->customer_phone){{ \App\Support\Phone::local($order->customer_phone) }}<br>@endif
                {{ $order->delivery_address }} {{ $order->delivery_city }}
            </p>
        @endif
        <table>
            <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead>
            <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $item->name }} <span class="muted">{{ $item->sku }}</span></td>
                    <td class="r">{{ $item->qty }}</td>
                    <td class="r">{{ number_format((float) $item->unit_price, 2) }}</td>
                    <td class="r">{{ number_format((float) $item->line_total, 2) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
        <table class="totals">
            <tr><td class="r">Subtotal</td><td class="r" style="width:30%">{{ number_format((float) $order->subtotal, 2) }}</td></tr>
            @if ((float) $order->discount > 0)<tr><td class="r">Discount</td><td class="r">-{{ number_format((float) $order->discount, 2) }}</td></tr>@endif
            @if ((float) $order->delivery_fee > 0)<tr><td class="r">Delivery</td><td class="r">{{ number_format((float) $order->delivery_fee, 2) }}</td></tr>@endif
            <tr><td class="r"><strong>Total (LKR)</strong></td><td class="r"><strong>{{ number_format((float) $order->total, 2) }}</strong></td></tr>
        </table>
        <p class="muted">Thank you for your order. Fulfilled by {{ $company }}.</p>
    </div>
@endforeach
</body>
</html>
