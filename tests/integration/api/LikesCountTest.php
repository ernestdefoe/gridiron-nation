<?php

namespace Ernestdefoe\GridironNation\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class LikesCountTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('flarum-likes', 'ernestdefoe-gridiron-nation');

        $this->prepareDatabase([
            User::class => [$this->normalUser()],
            Discussion::class => [
                ['id' => 1, 'title' => 'Game thread', 'created_at' => Carbon::now(), 'user_id' => 1, 'first_post_id' => 1, 'comment_count' => 1],
            ],
            Post::class => [
                ['id' => 1, 'discussion_id' => 1, 'number' => 1, 'user_id' => 1, 'type' => 'comment', 'content' => '<t><p>Kickoff</p></t>', 'created_at' => Carbon::now()],
            ],
        ]);
    }

    private function like(bool $liked): void
    {
        $response = $this->send($this->request('PATCH', '/api/posts/1', [
            'authenticatedAs' => 2,
            'json' => ['data' => ['type' => 'posts', 'id' => '1', 'attributes' => ['isLiked' => $liked]]],
        ]));

        $this->assertSame(200, $response->getStatusCode(), (string) $response->getBody());
    }

    private function likesCount(): int
    {
        $body = json_decode((string) $this->send($this->request('GET', '/api/discussions/1'))->getBody(), true);

        return $body['data']['attributes']['likesCount'];
    }

    #[Test]
    public function a_like_counts_on_the_discussion_and_an_unlike_takes_it_back()
    {
        $this->assertSame(0, $this->likesCount());

        $this->like(true);
        $this->assertSame(1, $this->likesCount());

        $this->like(false);
        $this->assertSame(0, $this->likesCount());
    }
}
