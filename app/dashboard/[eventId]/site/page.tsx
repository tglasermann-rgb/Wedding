import { requireEvent } from "@/lib/auth";
import { parseSections } from "@/lib/site/schema";
import { SiteEditor } from "./site-editor";

export default async function SitePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, event, canEdit } = await requireEvent(eventId);
  const { data: site } = await supabase.from("event_sites").select("*").eq("event_id", eventId).maybeSingle();
  return (
    <SiteEditor
      eventId={eventId}
      slug={event.slug}
      canEdit={canEdit}
      initial={{ themeId: site?.theme_id ?? "classic", published: site?.published ?? false, sections: parseSections(site?.sections) }}
    />
  );
}
