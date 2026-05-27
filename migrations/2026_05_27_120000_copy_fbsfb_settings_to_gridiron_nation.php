<?php

use Illuminate\Database\Schema\Builder;

/**
 * Copy legacy `fbsfb.*` / `ernestdefoe-fbsfb.*` settings rows to the new
 * `gridiron-nation.*` / `ernestdefoe-gridiron-nation.*` prefixes.
 *
 * The extension was renamed from ernestdefoe/fbsfb to
 * ernestdefoe/gridiron-nation. The composer rename forces Flarum to
 * treat it as a different extension ID (`ernestdefoe-gridiron-nation`
 * instead of `ernestdefoe-fbsfb`), and every settings row keyed under
 * the old prefix becomes orphaned in the `settings` table. extend.php
 * declares defaults for the new keys, but a forum that had already
 * customised widget toggles or hero deco values would silently revert
 * to defaults without this migration.
 *
 * What we do:
 *   - For each row whose key starts with `fbsfb.` or
 *     `ernestdefoe-fbsfb.`, derive the new key by swapping the prefix
 *     and `updateOrInsert` it under the new name with the same value.
 *   - Old rows are LEFT IN PLACE deliberately. If a deploy rolls back
 *     to fbsfb (composer require ernestdefoe/fbsfb:^1), the original
 *     keys are still there to be picked up — no data loss on downgrade.
 *   - `down` removes only the new-prefix rows; never touches the old
 *     ones.
 *
 * Safe to re-run: `updateOrInsert` is idempotent, and we don't touch
 * old rows.
 */
return [
    'up' => function (Builder $schema) {
        $db = $schema->getConnection();

        // Map old prefix → new prefix. Two pairs because Flarum stores
        // BOTH the admin-side key (ernestdefoe-fbsfb.*) and the public
        // forum-payload key (fbsfb.*) in the same settings table when
        // serializeToForum() was used.
        $prefixMap = [
            'fbsfb.'             => 'gridiron-nation.',
            'ernestdefoe-fbsfb.' => 'ernestdefoe-gridiron-nation.',
        ];

        foreach ($prefixMap as $oldPrefix => $newPrefix) {
            $rows = $db->table('settings')
                ->where('key', 'like', $oldPrefix . '%')
                ->get(['key', 'value']);

            foreach ($rows as $row) {
                $newKey = $newPrefix . substr($row->key, strlen($oldPrefix));

                $db->table('settings')->updateOrInsert(
                    ['key' => $newKey],
                    ['value' => $row->value]
                );
            }
        }
    },

    'down' => function (Builder $schema) {
        $db = $schema->getConnection();

        // Only remove rows under the NEW prefixes. The old fbsfb.* rows
        // are still in place from before this migration ran, so a
        // downgrade picks them back up cleanly.
        $db->table('settings')
            ->where('key', 'like', 'gridiron-nation.%')
            ->orWhere('key', 'like', 'ernestdefoe-gridiron-nation.%')
            ->delete();
    },
];
