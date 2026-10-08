<?php

namespace Ernestdefoe\GridironNation\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Store;
use PHPUnit\Framework\Attributes\Test;

class ForumPayloadTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-gridiron-nation');

        $this->prepareDatabase([
            User::class => [
                ['joined_at' => Carbon::now()->subYear()] + $this->normalUser(),
                ['id' => 3, 'username' => 'rookie', 'email' => 'rookie@machine.local', 'is_email_confirmed' => 1, 'joined_at' => Carbon::now(), 'avatar_url' => null],
            ],
            Discussion::class => [
                ['id' => 1, 'title' => 'Game thread', 'created_at' => Carbon::now(), 'user_id' => 2, 'first_post_id' => 1, 'comment_count' => 2],
            ],
            Post::class => [
                ['id' => 1, 'discussion_id' => 1, 'number' => 1, 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>Kickoff</p></t>', 'created_at' => Carbon::now()],
                ['id' => 2, 'discussion_id' => 1, 'number' => 2, 'user_id' => 3, 'type' => 'comment', 'content' => '<t><p>Touchdown</p></t>', 'created_at' => Carbon::now()],
            ],
        ]);
    }

    private function forum(): array
    {
        // The counts are cached for five minutes; every test starts cold.
        $this->app()->getContainer()->make(Store::class)->flush();

        return json_decode((string) $this->send($this->request('GET', '/api'))->getBody(), true)['data']['attributes'];
    }

    #[Test]
    public function every_widget_is_on_by_default()
    {
        $forum = $this->forum();

        $this->assertTrue($forum['gridiron-nation.widget_live_scores']);
        $this->assertTrue($forum['gridiron-nation.widget_trending']);
        $this->assertTrue($forum['gridiron-nation.widget_top_recruits']);
        $this->assertTrue($forum['gridiron-nation.hero_deco_enabled']);
        $this->assertSame(2, $forum['gridiron-nation.hero_deco_icon_count']);
        $this->assertSame(35, $forum['gridiron-nation.hero_deco_opacity']);
    }

    #[Test]
    public function a_widget_switched_off_is_off()
    {
        $this->setting('ernestdefoe-gridiron-nation.widget_live_scores', '0');
        $this->setting('ernestdefoe-gridiron-nation.hero_deco_opacity', '60');

        $forum = $this->forum();

        $this->assertFalse($forum['gridiron-nation.widget_live_scores']);
        $this->assertSame(60, $forum['gridiron-nation.hero_deco_opacity']);
    }

    #[Test]
    public function the_scoreboard_counts_members_topics_and_posts()
    {
        $forum = $this->forum();

        $this->assertSame(3, $forum['userCount']);
        $this->assertSame(1, $forum['discussionCount']);
        $this->assertSame(2, $forum['postCount']);
    }

    #[Test]
    public function the_newest_member_is_the_last_to_join()
    {
        $newest = $this->forum()['gridironNewestMember'];

        $this->assertSame(['id' => 3, 'username' => 'rookie', 'displayName' => 'rookie', 'avatarUrl' => null], $newest);
    }
}
