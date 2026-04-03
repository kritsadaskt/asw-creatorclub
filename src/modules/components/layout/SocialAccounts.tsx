import { useEffect, useState } from "react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube, FaXTwitter } from "react-icons/fa6";
import { Input } from "../shared/Input";
import { Lemon8Icon } from "../../utils/svg";

type SocialAccountsMap = {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  lemon8?: string;
};

type FollowerCountsMap = {
  facebook?: number;
  instagram?: number;
  tiktok?: number;
  youtube?: number;
  twitter?: number;
  lemon8?: number;
};

type SocialAccountsProps = {
  initialSocialAccounts?: SocialAccountsMap;
  initialFollowerCounts?: FollowerCountsMap;
  requireAtLeastOne?: boolean;
  showErrors?: boolean;
  label?: string;
  description?: string;
  onChange?: (data: {
    socialAccounts: SocialAccountsMap;
    followerCounts: FollowerCountsMap;
    isValid: boolean;
    errors: Record<string, string>;
    socialError: string;
  }) => void;
};

const urlRegex = /^https:\/\/.+/;

const SOCIAL_URL_PREFIXES: Record<keyof SocialAccountsMap, string> = {
  facebook: "https://facebook.com/",
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://www.youtube.com/",
  twitter: "https://x.com/",
  lemon8: "https://lemon8.com/",
};

export default function SocialAccounts({
  initialSocialAccounts,
  initialFollowerCounts,
  requireAtLeastOne = true,
  showErrors = false,
  label = "ลิงก์ URL โซเชียลมีเดีย",
  description = "กรอกข้อมูล URL หรือ Username ของ Social Media ของคุณ อย่างน้อย 1 แพลตฟอร์ม และระบุจำนวน Follower ในปัจจุบัน",
  onChange,
}: SocialAccountsProps) {
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountsMap>(
    () => initialSocialAccounts || {}
  );
  const [followerCounts, setFollowerCounts] = useState<FollowerCountsMap>(
    () => initialFollowerCounts || {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [socialError, setSocialError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (accounts: SocialAccountsMap) => {
    const allErrors: Record<string, string> = {};

    const hasAnySocial =
      !!accounts.facebook ||
      !!accounts.instagram ||
      !!accounts.tiktok ||
      !!accounts.youtube ||
      !!accounts.twitter ||
      !!accounts.lemon8;

    if (requireAtLeastOne && !hasAnySocial) {
      allErrors.social = "กรุณากรอกข้อมูล Social Media อย่างน้อย 1 แพลตฟอร์ม";
    }

    const validateSocialUrl = (key: keyof SocialAccountsMap, label: string) => {
      const rawValue = accounts[key];
      if (!rawValue) return;

      const trimmed = rawValue.trim();

      // Basic requirement: must start with https://
      if (!urlRegex.test(trimmed)) {
        allErrors[`${key}Url`] = `กรุณากรอก ${label} ให้เป็นลิงก์ที่ขึ้นต้นด้วย https://`;
        return;
      }

      const prefix = SOCIAL_URL_PREFIXES[key];

      // If value starts with our platform prefix, ensure there is a non-slash suffix (username / path)
      if (prefix && trimmed.startsWith(prefix)) {
        const suffix = trimmed.slice(prefix.length);
        const hasNonSlashSuffix = suffix.replace(/\//g, "").length > 0;

        if (!hasNonSlashSuffix) {
          allErrors[`${key}Url`] = `กรุณากรอก ${label} ให้เป็นลิงก์โปรไฟล์ที่ครบถ้วน รวมถึงชื่อช่องหรือ Username`;
        }
      }
    };

    validateSocialUrl("facebook", "Facebook URL");
    validateSocialUrl("instagram", "Instagram URL");
    validateSocialUrl("tiktok", "TikTok URL");
    validateSocialUrl("youtube", "YouTube URL");
    validateSocialUrl("twitter", "X (Twitter) URL");
    validateSocialUrl("lemon8", "Lemon8 URL");

    const isValid = Object.keys(allErrors).length === 0;

    // Control what is shown (UX) vs what is validated (logic)
    const visibleErrors: Record<string, string> = {};
    Object.entries(allErrors).forEach(([key, value]) => {
      if (key === "social") {
        if (showErrors) {
          visibleErrors[key] = value;
        }
        return;
      }

      // URL field errors should show only after user blur OR after parent requests showErrors
      if (key.endsWith("Url")) {
        const touchedKey = key; // facebookUrl, instagramUrl, ...
        if (showErrors || touched[touchedKey]) {
          visibleErrors[key] = value;
        }
        return;
      }

      visibleErrors[key] = value;
    });

    setErrors(visibleErrors);
    setSocialError(visibleErrors.social || "");

    onChange?.({
      socialAccounts: accounts,
      followerCounts,
      isValid,
      errors: allErrors,
      socialError: allErrors.social || "",
    });
  };

  useEffect(() => {
    validate(socialAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireAtLeastOne, showErrors]);

  const handleUrlChange = (key: keyof SocialAccountsMap, value: string) => {
    const next = { ...socialAccounts, [key]: value };
    setSocialAccounts(next);
    validate(next);
  };

  const handleUrlFocus = (key: keyof SocialAccountsMap) => {
    const current = socialAccounts[key]?.trim();
    if (current) return;
    handleUrlChange(key, SOCIAL_URL_PREFIXES[key]);
  };

  const handleFollowersChange = (key: keyof FollowerCountsMap, value: string) => {
    const numeric = value ? parseInt(value, 10) : undefined;
    const next = { ...followerCounts, [key]: isNaN(Number(numeric)) ? undefined : numeric };
    setFollowerCounts(next);
    onChange?.({
      socialAccounts,
      followerCounts: next,
      isValid: Object.keys(errors).length === 0,
      errors,
      socialError,
    });
  };

  const handleBlur = (fieldKey: string) => {
    const nextTouched = { ...touched, [fieldKey]: true };
    setTouched(nextTouched);
    // keep touched for display; validation state doesn't depend on touched
    validate(socialAccounts);
  };

  return (
    <div className="space-y-4 pt-4">
      <h3 className="font-semibold text-primary">{label}</h3>
      {description && (
        <p className="text-sm text-muted-foreground -mt-2">
          {description}
        </p>
      )}
      {socialError && (
        <p className="mt-1 text-xs text-destructive">
          {socialError}
        </p>
      )}

      {/* Facebook */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Facebook URL"
            icon={<FaFacebook className="h-5 w-5 text-[#1877F2]" />}
            value={socialAccounts.facebook || ""}
            onChange={(value) => handleUrlChange("facebook", value)}
            onFocus={() => handleUrlFocus("facebook")}
            placeholder="https://facebook.com/..."
            onBlur={() => handleBlur("facebookUrl")}
            error={errors.facebookUrl}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.facebook?.toString() || ""}
            onChange={(value) => handleFollowersChange("facebook", value)}
            placeholder="0"
            min={0}
          />
        </div>
      </div>

      {/* Instagram */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Instagram URL"
            icon={<FaInstagram className="h-5 w-5 text-pink-500" />}
            value={socialAccounts.instagram || ""}
            onChange={(value) => handleUrlChange("instagram", value)}
            onFocus={() => handleUrlFocus("instagram")}
            placeholder="https://instagram.com/..."
            onBlur={() => handleBlur("instagramUrl")}
            error={errors.instagramUrl}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.instagram?.toString() || ""}
            onChange={(value) => handleFollowersChange("instagram", value)}
            placeholder="0"
            min={0}
          />
        </div>
      </div>

      {/* TikTok */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            label="TikTok URL"
            icon={<FaTiktok className="h-5 w-5 text-black" />}
            value={socialAccounts.tiktok || ""}
            onChange={(value) => handleUrlChange("tiktok", value)}
            onFocus={() => handleUrlFocus("tiktok")}
            placeholder="https://tiktok.com/@..."
            onBlur={() => handleBlur("tiktokUrl")}
            error={errors.tiktokUrl}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.tiktok?.toString() || ""}
            onChange={(value) => handleFollowersChange("tiktok", value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* YouTube */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            label="YouTube URL"
            icon={<FaYoutube className="h-5 w-5 text-red-600" />}
            value={socialAccounts.youtube || ""}
            onChange={(value) => handleUrlChange("youtube", value)}
            onFocus={() => handleUrlFocus("youtube")}
            placeholder="https://youtube.com/..."
            onBlur={() => handleBlur("youtubeUrl")}
            error={errors.youtubeUrl}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.youtube?.toString() || ""}
            onChange={(value) => handleFollowersChange("youtube", value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Twitter */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            label="X (Twitter) URL"
            icon={<FaXTwitter className="h-5 w-5 text-black" />}
            value={socialAccounts.twitter || ""}
            onChange={(value) => handleUrlChange("twitter", value)}
            onFocus={() => handleUrlFocus("twitter")}
            placeholder="https://x.com/..."
            onBlur={() => handleBlur("twitterUrl")}
            error={errors.twitterUrl}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.twitter?.toString() || ""}
            onChange={(value) => handleFollowersChange("twitter", value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Lemon8 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Lemon8"
            icon={<Lemon8Icon className="w-5 h-5 text-yellow-500" />}
            value={socialAccounts.lemon8 || ""}
            onChange={(value) => handleUrlChange("lemon8", value)}
            onFocus={() => handleUrlFocus("lemon8")}
            placeholder="https://lemon8.com/..."
            onBlur={() => handleBlur("lemon8Url")}
            error={errors.lemon8Url}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.lemon8?.toString() || ""}
            onChange={(value) => handleFollowersChange("lemon8", value)}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}