<?php

namespace Ernestdefoe\GridironNation\Tests\integration\api;

use Flarum\Testing\integration\TestCase;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use Illuminate\Contracts\Cache\Store;
use PHPUnit\Framework\Attributes\Test;

/**
 * The live score strip proxies ESPN. ESPN is replaced by canned responses:
 * no test reaches the network.
 */
class LiveScoresTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-gridiron-nation');
    }

    private function game(string $id, string $status, int $home, int $away): array
    {
        return [
            'id' => $id,
            'status' => ['type' => ['name' => $status, 'shortDetail' => $status]],
            'competitions' => [[
                'competitors' => [
                    ['homeAway' => 'home', 'score' => (string) $home, 'team' => ['abbreviation' => "H$id", 'displayName' => "Home $id", 'logo' => "https://a.espncdn.com/$id-h.png"]],
                    ['homeAway' => 'away', 'score' => (string) $away, 'team' => ['abbreviation' => "A$id", 'displayName' => "Away $id"]],
                ],
            ]],
        ];
    }

    /** @param list<Response> $responses */
    private function scores(array $responses): array
    {
        $container = $this->app()->getContainer();
        $container->make(Store::class)->flush();
        $container->instance(Client::class, new Client(['handler' => HandlerStack::create(new MockHandler($responses))]));

        $response = $this->send($this->request('GET', '/api/gn-live-scores'));
        $this->assertSame(200, $response->getStatusCode());

        return json_decode((string) $response->getBody(), true)['games'];
    }

    #[Test]
    public function live_games_lead_then_upcoming_then_finished_six_at_most()
    {
        $events = [
            $this->game('1', 'STATUS_FINAL', 21, 14),
            $this->game('2', 'STATUS_SCHEDULED', 0, 0),
            $this->game('3', 'STATUS_IN_PROGRESS', 7, 10),
            $this->game('4', 'STATUS_SCHEDULED', 0, 0),
            $this->game('5', 'STATUS_SCHEDULED', 0, 0),
            $this->game('6', 'STATUS_SCHEDULED', 0, 0),
            $this->game('7', 'STATUS_SCHEDULED', 0, 0),
        ];

        $games = $this->scores([new Response(200, [], json_encode(['events' => $events]))]);

        $this->assertCount(6, $games);
        $this->assertSame('3', $games[0]['id']);
        $this->assertTrue($games[0]['isLive']);
        $this->assertTrue($games[0]['awayWins']);
        $this->assertSame(['abbr' => 'H3', 'name' => 'Home 3', 'score' => 7, 'logo' => 'https://a.espncdn.com/3-h.png'], $games[0]['home']);
        $this->assertNotContains('1', array_column($games, 'id'), 'The finished game is the one that falls off');
    }

    #[Test]
    public function an_espn_outage_is_an_empty_strip_not_an_error()
    {
        $this->assertSame([], $this->scores([new Response(503, [], 'Service Unavailable')]));
    }
}
