export type SkillLevelKey = "expert" | "advanced";

export type TechnologyItem = {
  name: string;
  levelKey: SkillLevelKey;
};

export type LocaleLabels = {
  nav: {
    about: string;
    experience: string;
    skills: string;
    contact: string;
    brandPrefix: string;
    brandSuffix: string;
  };
  hero: {
    role: string;
    title: string;
    description: {
      before: string;
      highlightExperience: string;
      middle: string;
      highlightArchitecture: string;
      after: string;
    };
    contactMe: string;
    viewExperience: string;
    available: string;
  };
  highlights: {
    years: string;
    yearsDesc: string;
    leadership: string;
    leadershipDesc: string;
    enterprise: string;
    enterpriseDesc: string;
  };
  experience: {
    title: string;
    subtitle: string;
    jobs: Array<{
      title: string;
      company: string;
      period: string;
      description: string;
    }>;
  };
  skills: {
    title: string;
    subtitle: string;
    serverSide: string;
    clientSide: string;
    infrastructure: string;
    levels: Record<SkillLevelKey, string>;
    technologies: {
      server: TechnologyItem[];
      client: TechnologyItem[];
      infrastructure: TechnologyItem[];
    };
    techStrip: {
      performance: string;
      security: string;
      data: string;
      cloud: string;
    };
  };
  contact: {
    title: string;
    subtitle: string;
    emailMe: string;
    linkedin: string;
    github: string;
  };
  footer: {
    copyright: string;
  };
};

export type Locale = "es" | "en" | "fr" | "pt";
