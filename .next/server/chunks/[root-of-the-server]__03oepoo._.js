module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},34958,e=>{"use strict";async function t(e){let t=new TextEncoder().encode(e);return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",t))).map(e=>e.toString(16).padStart(2,"0")).join("")}async function r(e,r){return await t(e)===r}e.s(["hashPassword",0,t,"validatePassword",0,function(e){return e?e.length<6?{isValid:!1,error:"รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"}:{isValid:!0}:{isValid:!1,error:"กรุณากรอกรหัสผ่าน"}},"verifyPassword",0,r])},88372,e=>{"use strict";var t=e.i(88551);e.i(34958);let r=async e=>{let{data:r,error:a}=await t.supabase.from("profiles").select("*").eq("id",e).single();if(a){if("PGRST116"===a.code)return null;throw console.error("Error getting Creator by ID:",a),a}return r?s(r):null},a=async e=>{let{data:r,error:a}=await t.supabase.from("profiles").select("*").eq("email",e).single();if(a){if("PGRST116"===a.code)return null;throw console.error("Error getting Creator by email:",a),a}return r?s(r):null},s=e=>({id:e.id,email:e.email||"",name:e.name||"",lastName:e.lastname||void 0,phone:e.phone||"",baseLocation:e.base_location||"",province:e.province,categories:Array.isArray(e.categories)?e.categories:e.category?[e.category]:[],followers:e.followers||0,profileImage:e.profile_image,socialAccounts:e.social_accounts||{},followerCounts:e.follower_counts||{},budgets:e.budgets||{},approvalStatus:"number"==typeof e.approval_status?e.approval_status:3,status:e.status||"general",projectName:e.project_name,createdAt:e.created_at||new Date().toISOString(),facebookId:e.facebook_id,passwordHash:e.password_hash});e.s(["getCreatorByEmail",0,a,"getCreatorById",0,r],88372)},93475,e=>{"use strict";let t=process.env.SMTP_HOST,r=process.env.SMTP_PORT,a=process.env.SMTP_USERNAME,s=process.env.SMTP_PASSWORD,n=process.env.SMTP_FROM_ADDRESS,o=e=>{if(!t||!r||!a||!s||!n)throw console.error("SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_ADDRESS."),Error("SMTP configuration is incomplete");return{host:t,port:parseInt(r,10),username:a,password:s,from:n,...e}};e.s(["buildApprovalEmailPayload",0,e=>{let t=`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>AssetWise Creators Club - Approved</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5; margin: 0; padding: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 16px; padding: 32px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">ยินดีต้อนรับสู่ AssetWise Creators Club</h1>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      สวัสดีคุณ ${e.name},
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      คำขอเข้าร่วมของคุณได้รับการ<strong>อนุมัติ</strong>เรียบร้อยแล้ว คุณสามารถเริ่มต้นใช้งานแพลตฟอร์มสำหรับ Creators ของเราได้ทันที
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      หากคุณมีข้อสงสัยหรือพบปัญหาในการใช้งาน สามารถติดต่อทีมงานได้ผ่านช่องทางที่ระบุในเว็บไซต์
                    </p>
                    <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
                      ขอบคุณที่เข้าร่วมเป็นส่วนหนึ่งของ AssetWise Creators Club
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;return o({to:e.email,subject:"AssetWise Creators Club - อนุมัติการเข้าร่วม",html:t})},"buildRejectionEmailPayload",0,e=>{let t=`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>AssetWise Creators Club - Application Result</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5; margin: 0; padding: 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 16px; padding: 32px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">ผลการพิจารณาเข้าร่วม AssetWise Creators Club</h1>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      สวัสดีคุณ ${e.name},
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      หลังจากการตรวจสอบคำขอของคุณ ทีมงานขอแจ้งให้ทราบว่า<strong>ไม่สามารถอนุมัติ</strong>คำขอเข้าร่วมได้ในขณะนี้
                    </p>
                    <p style="margin: 0 0 12px; font-size: 15px; color: #374151;">
                      คุณสามารถติดต่อทีมงานเพื่อสอบถามข้อมูลเพิ่มเติม หรือลองสมัครใหม่อีกครั้งในอนาคตได้เช่นกัน
                    </p>
                    <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
                      ขอบคุณที่ให้ความสนใจใน AssetWise Creators Club
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;return o({to:e.email,subject:"AssetWise Creators Club - ผลการพิจารณา",html:t})}])},97617,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),s=e.i(59756),n=e.i(61916),o=e.i(74677),i=e.i(69741),l=e.i(16795),d=e.i(87718),p=e.i(95169),c=e.i(47587),u=e.i(66012),g=e.i(70101),m=e.i(26937),f=e.i(10372),h=e.i(93695);e.i(52474);var x=e.i(5232),y=e.i(89171),v=e.i(88372),R=e.i(93475);async function b(e,{params:t}){try{let{id:e}=await t,r=await (0,v.getCreatorById)(e);if(!r)return y.NextResponse.json({error:"Creator not found"},{status:404});let a=(0,R.buildRejectionEmailPayload)(r);return y.NextResponse.json({success:!0,smtpPayload:{...a,password:void 0}})}catch(e){return console.error("Send rejection email error:",e),y.NextResponse.json({error:"Internal server error"},{status:500})}}e.s(["POST",0,b],24622);var w=e.i(24622);let C=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/creators/[id]/email/rejection/route",pathname:"/api/admin/creators/[id]/email/rejection",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/admin/creators/[id]/email/rejection/route.ts",nextConfigOutput:"",userland:w}),{workAsyncStorage:S,workUnitAsyncStorage:E,serverHooks:A}=C;async function P(e,t,a){a.requestMeta&&(0,s.setRequestMeta)(e,a.requestMeta),C.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/admin/creators/[id]/email/rejection/route";y=y.replace(/\/index$/,"")||"/";let v=await C.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!v)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:b,nextConfig:w,parsedUrl:S,isDraftMode:E,prerenderManifest:A,routerServerContext:P,isOnDemandRevalidate:T,revalidateOnlyGenerated:_,resolvedPathname:M,clientReferenceManifest:O,serverActionsManifest:j}=v,N=(0,i.normalizeAppPath)(y),k=!!(A.dynamicRoutes[N]||A.routes[M]),q=async()=>((null==P?void 0:P.render404)?await P.render404(e,t,S,!1):t.end("This page could not be found"),null);if(k&&!E){let e=!!A.routes[M],t=A.dynamicRoutes[N];if(t&&!1===t.fallback&&!e){if(w.adapterPath)return await q();throw new h.NoFallbackError}}let I=null;!k||C.isDev||E||(I="/index"===(I=M)?"/":I);let D=!0===C.isDev||!k,U=k&&!D;j&&O&&(0,o.setManifestsSingleton)({page:y,clientReferenceManifest:O,serverActionsManifest:j});let H=e.method||"GET",F=(0,n.getTracer)(),W=F.getActiveScopeSpan(),z=!!(null==P?void 0:P.isWrappedByNextServer),B=!!(0,s.getRequestMeta)(e,"minimalMode"),$=(0,s.getRequestMeta)(e,"incrementalCache")||await C.getIncrementalCache(e,w,A,B);null==$||$.resetRequestCache(),globalThis.__incrementalCache=$;let K={params:b,previewProps:A.preview,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:D,incrementalCache:$,cacheLifeProfiles:w.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,s)=>C.onRequestError(e,t,a,s,P)},sharedContext:{buildId:R}},L=new l.NodeNextRequest(e),V=new l.NodeNextResponse(t),G=d.NextRequestAdapter.fromNodeNextRequest(L,(0,d.signalFromNodeResponse)(t));try{let s,o=async e=>C.handle(G,K).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=F.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${H} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),s&&s!==e&&(s.setAttribute("http.route",a),s.updateName(t))}else e.updateName(`${H} ${y}`)}),i=async s=>{var n,i;let l=async({previousCacheEntry:r})=>{try{if(!B&&T&&_&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await o(s);e.fetchMetrics=K.renderOpts.fetchMetrics;let i=K.renderOpts.pendingWaitUntil;i&&a.waitUntil&&(a.waitUntil(i),i=void 0);let l=K.renderOpts.collectedTags;if(!k)return await (0,u.sendResponse)(L,V,n,K.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,g.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[f.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&K.renderOpts.collectedRevalidate,a=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:K.renderOpts.collectedExpire;return{value:{kind:x.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await C.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:U,isOnDemandRevalidate:T})},!1,P),t}},d=await C.handleResponse({req:e,nextConfig:w,cacheKey:I,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:_,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:B});if(!k)return null;if((null==d||null==(n=d.value)?void 0:n.kind)!==x.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(i=d.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});B||t.setHeader("x-nextjs-cache",T?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),E&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,g.fromNodeOutgoingHttpHeaders)(d.value.headers);return B&&k||p.delete(f.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,m.getCacheControlHeader)(d.cacheControl)),await (0,u.sendResponse)(L,V,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};z&&W?await i(W):(s=F.getActiveScopeSpan(),await F.withPropagatedContext(e.headers,()=>F.trace(p.BaseServerSpan.handleRequest,{spanName:`${H} ${y}`,kind:n.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},i),void 0,!z))}catch(t){if(t instanceof h.NoFallbackError||await C.onRequestError(e,t,{routerKind:"App Router",routePath:N,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:U,isOnDemandRevalidate:T})},!1,P),k)throw t;return await (0,u.sendResponse)(L,V,new Response(null,{status:500})),null}}e.s(["handler",0,P,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:E})},"routeModule",0,C,"serverHooks",0,A,"workAsyncStorage",0,S,"workUnitAsyncStorage",0,E],97617)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__03oepoo._.js.map