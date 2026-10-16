<?php

namespace Tests;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    /** Roles, couriers and default templates for every feature test. */
    protected bool $seed = true;

    protected string $seeder = DatabaseSeeder::class;

    protected function setUp(): void
    {
        parent::setUp();

        // Tests never hit the real network (CLAUDE.md rule 8).
        Http::preventStrayRequests();
        config(['portal.sms.driver' => 'log']);
    }
}
