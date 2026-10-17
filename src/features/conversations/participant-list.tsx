"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ConversationDetail } from "@/features/conversations/hooks";
import { usePresenceLabel } from "@/features/conversations/presence";

type Member = ConversationDetail["members"][number];

export function ParticipantList({
  members,
  meId,
  showRoles,
}: {
  members: Member[];
  meId?: string;
  showRoles: boolean;
}) {
  return (
    <ul className="flex flex-col">
      {members.map((m) => (
        <ParticipantRow key={m.id} meId={meId} member={m} showRoles={showRoles} />
      ))}
    </ul>
  );
}

function ParticipantRow({
  member,
  meId,
  showRoles,
}: {
  member: Member;
  meId?: string;
  showRoles: boolean;
}) {
  const t = useTranslations("conversations");
  const presence = usePresenceLabel(member.lastSeenAt);

  return (
    <li className="flex items-center gap-3 py-2">
      <Avatar>
        {member.image && <AvatarImage alt="" src={member.image} />}
        <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-sm">
          {member.name}
          {member.id === meId && ` (${t("you")})`}
        </span>
        {presence && (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            {presence.online && (
              <span aria-hidden="true" className="inline-block size-2 rounded-full bg-success" />
            )}
            {presence.label}
          </span>
        )}
      </div>
      {showRoles && (
        <Badge variant={member.role === "owner" ? "default" : "secondary"}>
          {t(member.role === "owner" ? "owner" : "member")}
        </Badge>
      )}
    </li>
  );
}
