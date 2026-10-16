<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 12px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #000; }
    .page { page-break-after: always; border: 2px solid #000; padding: 10px; height: 380px; }
    .page:last-child { page-break-after: auto; }
    .big { font-size: 16px; font-weight: bold; }
    .cod { font-size: 18px; font-weight: bold; border: 2px solid #000; padding: 6px; text-align: center; margin-top: 10px; }
    .muted { color: #444; font-size: 9px; }
    hr { border: 0; border-top: 1px dashed #000; }
</style>
</head>
<body>
@foreach ($orders as $order)
    @php($shop = $shops[$order->shop_id])
    <div class="page">
        <div class="muted">ORDER</div>
        <div class="big">{{ $order->number }}</div>
        @if ($order->courierAccount)
            <div>{{ $order->courierAccount->courier->name }} · {{ $order->tracking_number }}</div>
        @endif
        <hr>
        <div class="muted">TO</div>
        <div class="big">{{ $order->customer_name }}</div>
        <div>{{ $order->customer_phone ? \App\Support\Phone::local($order->customer_phone) : '' }}</div>
        <div>{{ $order->delivery_address }}</div>
        <div><strong>{{ $order->delivery_city }}</strong></div>
        <hr>
        <div class="muted">FROM</div>
        <div>{{ $order->seller->value === 'gloma' ? $company : $shop->name }}</div>
        <div>{{ $shop->phone }}</div>
        <div class="muted">{{ $order->items->map(fn ($i) => $i->name.' x'.$i->qty)->implode(', ') }}</div>
        @if ($order->payment_status->value === 'unpaid' && $order->paymentMethod?->kind->value === 'cod')
            <div class="cod">COD: LKR {{ number_format((float) $order->total, 2) }}</div>
        @else
            <div class="cod">PAID</div>
        @endif
    </div>
@endforeach
</body>
</html>
