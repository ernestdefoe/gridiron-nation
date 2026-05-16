<?php

use Ernestdefoe\Fbsfb\Api\Controller\LiveScoresController;
use Ernestdefoe\Fbsfb\Api\Controller\OnlineNowController;
use Ernestdefoe\Fbsfb\Api\Controller\Recruit\CreateRecruitController;
use Ernestdefoe\Fbsfb\Api\Controller\Recruit\DeleteRecruitController;
use Ernestdefoe\Fbsfb\Api\Controller\Recruit\ListRecruitsController;
use Ernestdefoe\Fbsfb\Api\Controller\Recruit\UpdateRecruitController;
use Flarum\Extend;

return [
    // ── Frontend ──────────────────────────────────────────────────────────────
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js')
        ->css(__DIR__ . '/less/admin.less'),

    new Extend\Locales(__DIR__ . '/locale'),

    // ── API routes ───────────────────────────────────────────────────────────
    (new Extend\Routes('api'))
        // Phase 2 — Live Scores (ESPN proxy, CORS-safe, public)
        ->get('/gn-live-scores',          'gn.live-scores',        LiveScoresController::class)
        // Phase 4 — Online Now
        ->get('/gn-online',               'gn.online',             OnlineNowController::class)
        // Phase 5 — Top Recruits CRUD
        ->get('/gn-recruits',             'gn.recruits.list',      ListRecruitsController::class)
        ->post('/gn-recruits',            'gn.recruits.create',    CreateRecruitController::class)
        ->patch('/gn-recruits/{id}',      'gn.recruits.update',    UpdateRecruitController::class)
        ->delete('/gn-recruits/{id}',     'gn.recruits.delete',    DeleteRecruitController::class),
];
