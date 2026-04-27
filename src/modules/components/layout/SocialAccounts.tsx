import { useEffect, useState } from "react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube, FaXTwitter } from "react-icons/fa6";
import { Input } from "../shared/Input";
import { Lemon8Icon } from "../../utils/svg";
import {
  isValidSocialUrlForPlatform,
  SOCIAL_URL_INPUT_TITLES,
  type SocialPlatform,
} from "../../utils/social-url";

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
  disabled?: boolean;
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

export default function SocialAccounts({
  initialSocialAccounts,
  initialFollowerCounts,
  requireAtLeastOne = true,
  showErrors = false,
  disabled = false,
  label = "ลิงก์ URL โซเชียลมีเดีย",
  description = "ระบุอย่างน้อย 1 แพลตฟอร์ม และระบุจำนวน Follower กรุณาตรวจสอบ format ของ URL หรือ Username ให้ถูกต้อง",
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

    const validateSocialUrl = (key: SocialPlatform, label: string) => {
      const rawValue = accounts[key];
      if (!rawValue) return;

      if (!isValidSocialUrlForPlatform(key, rawValue)) {
        allErrors[`${key}Url`] = SOCIAL_URL_INPUT_TITLES[key] || `กรุณากรอก ${label} ให้ถูกต้อง`;
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

      // URL field errors only after submit / parent sets showErrors
      if (key.endsWith("Url")) {
        if (showErrors) {
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
            disabled={disabled}
            placeholder="เช่น username หรือ facebook.com/…"
            error={errors.facebookUrl}
            title={SOCIAL_URL_INPUT_TITLES.facebook}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.facebook?.toString() || ""}
            onChange={(value) => handleFollowersChange("facebook", value)}
            disabled={disabled}
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
            disabled={disabled}
            placeholder="เช่น @user หรือ instagram.com/…"
            error={errors.instagramUrl}
            title={SOCIAL_URL_INPUT_TITLES.instagram}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.instagram?.toString() || ""}
            onChange={(value) => handleFollowersChange("instagram", value)}
            disabled={disabled}
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
            disabled={disabled}
            placeholder="เช่น @user หรือ tiktok.com/…"
            error={errors.tiktokUrl}
            title={SOCIAL_URL_INPUT_TITLES.tiktok}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.tiktok?.toString() || ""}
            onChange={(value) => handleFollowersChange("tiktok", value)}
            disabled={disabled}
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
            disabled={disabled}
            placeholder="เช่น ลิงก์ช่องหรือ youtube.com/…"
            error={errors.youtubeUrl}
            title={SOCIAL_URL_INPUT_TITLES.youtube}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.youtube?.toString() || ""}
            onChange={(value) => handleFollowersChange("youtube", value)}
            disabled={disabled}
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
            disabled={disabled}
            placeholder="เช่น @user หรือ x.com/…"
            error={errors.twitterUrl}
            title={SOCIAL_URL_INPUT_TITLES.twitter}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.twitter?.toString() || ""}
            onChange={(value) => handleFollowersChange("twitter", value)}
            disabled={disabled}
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
            disabled={disabled}
            placeholder="เช่น user หรือ lemon8.com/…"
            error={errors.lemon8Url}
            title={SOCIAL_URL_INPUT_TITLES.lemon8}
          />
        </div>
        <div>
          <Input
            label="จำนวนผู้ติดตาม"
            type="number"
            value={followerCounts.lemon8?.toString() || ""}
            onChange={(value) => handleFollowersChange("lemon8", value)}
            disabled={disabled}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}