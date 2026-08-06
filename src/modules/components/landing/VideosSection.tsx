const YOUTUBE_VIDEO_ID = 'op8wnrvFoFk';
const YOUTUBE_EMBED_SRC = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`;

export function VideosSection() {
  return (
    <section id="videos" className="relative overflow-hidden bg-primary text-white pt-10 pb-16 md:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(249,115,22,0.35)_0%,_rgba(249,115,22,0.12)_35%,_transparent_70%)]"
      />
      <div className="relative container mx-auto px-6">
        <h3 className="text-3xl lg:text-5xl font-medium text-center mb-2">VIDEO</h3>
        <p className="text-center text-neutral-50 font-light text-base lg:text-xl mb-8 lg:mb-10">ประมวลภาพกิจกรรม Welcome & Level Up กับเหล่าครีเอเตอร์</p>

        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-black/40 shadow-lg ring-1 ring-white/10">
          <div className="relative aspect-video w-full">
            <iframe
              src={YOUTUBE_EMBED_SRC}
              title="AssetWise Creator Club"
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
