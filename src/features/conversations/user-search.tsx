"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserSearch } from "@/features/conversations/hooks";

/**
 * User directory search. `onPick` renders rows as buttons (DM flow);
 * `selectedIds` + `onToggle` renders checkbox rows (group flow).
 */
export function UserSearch({
  onPick,
  selectedIds,
  onToggle,
}: {
  onPick?: (userId: string) => void;
  selectedIds?: Set<string>;
  onToggle?: (userId: string) => void;
}) {
  const t = useTranslations("users");
  const [query, setQuery] = useState("");
  const { data, isPending, isFetching } = useUserSearch(query);
  const enabled = query.trim().length >= 2;

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <Input
        aria-label={t("search")}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        type="search"
        value={query}
      />
      <ScrollArea className="h-56">
        {!enabled ? (
          <p className="p-3 text-muted-foreground text-sm">{t("searchHint")}</p>
        ) : isPending || (isFetching && !data) ? (
          <p className="p-3 text-muted-foreground text-sm">{t("searching")}</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-3 text-muted-foreground text-sm">{t("noResults")}</p>
        ) : (
          <ul>
            {data.items.map((u) => (
              <li key={u.id}>
                {onToggle ? (
                  <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-accent hover:text-accent-foreground">
                    <input
                      checked={selectedIds?.has(u.id) ?? false}
                      className="size-4"
                      onChange={() => onToggle(u.id)}
                      type="checkbox"
                    />
                    <UserRow name={u.name} image={u.image} />
                  </label>
                ) : (
                  <button
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onPick?.(u.id)}
                    type="button"
                  >
                    <UserRow name={u.name} image={u.image} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

function UserRow({ name, image }: { name: string; image: string | null }) {
  return (
    <>
      <Avatar>
        {image && <AvatarImage alt="" src={image} />}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium text-sm">{name}</span>
    </>
  );
}
