<?php

namespace Ernestdefoe\GridironNation\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Store;
use PHPUnit\Framework\Attributes\Test;

class OnlineNowTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-gridiron-nation');

        $this->prepareDatabase([
            User::class => [
                ['last_seen_at' => Carbon::now()->subMinute()] + $this->normalUser(),
                ['id' => 3, 'username' => 'lurker', 'email' => 'lurker@machine.local', 'is_email_confirmed' => 1, 'last_seen_at' => Carbon::now()->subMinute(), 'preferences' => json_encode(['discloseOnline' => false])],
                ['id' => 4, 'username' => 'away', 'email' => 'away@machine.local', 'is_email_confirmed' => 1, 'last_seen_at' => Carbon::now()->subHour()],
            ],
        ]);
    }

    private function online(?int $actor)
    {
        $this->app()->getContainer()->make(Store::class)->flush();

        return $this->send($this->request('GET', '/api/gn-online', $actor ? ['authenticatedAs' => $actor] : []));
    }

    #[Test]
    public function a_guest_cannot_see_who_is_online()
    {
        $this->assertSame(401, $this->online(null)->getStatusCode());
    }

    #[Test]
    public function members_see_who_was_here_in_the_last_five_minutes_and_chose_to_show_it()
    {
        $response = $this->online(2);

        $this->assertSame(200, $response->getStatusCode());
        $body = json_decode((string) $response->getBody(), true);

        $this->assertSame(['normal'], array_column($body['users'], 'slug'), 'Not the member hiding their status, nor the one away an hour');
        $this->assertSame(1, $body['count']);
    }
}
