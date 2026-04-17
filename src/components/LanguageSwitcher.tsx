import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Language } from "@/i18n/translations";

export const LanguageSwitcher = () => {
  const { language, setLanguage, languageNames } = useLanguage();

  return (
    <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
      <SelectTrigger className="w-auto h-9 border-0 bg-transparent gap-1 px-2 text-xs">
        <Globe className="w-4 h-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
          <SelectItem key={code} value={code} className="text-sm">{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
