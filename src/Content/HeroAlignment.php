<?php

namespace Ernestdefoe\GridironNation\Content;

use Flarum\Frontend\Document;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Puts the discussion-hero alignment on <html> (data-gn-hero-align) so the
 * stylesheet can lay the hero out before any JS runs — no left-then-centre
 * jump on first paint.
 */
class HeroAlignment
{
    public function __construct(protected SettingsRepositoryInterface $settings)
    {
    }

    public function __invoke(Document $document): void
    {
        $align = $this->settings->get('ernestdefoe-gridiron-nation.hero_align');

        $document->extraAttributes['data-gn-hero-align'] = $align === 'center' ? 'center' : 'left';
    }
}
