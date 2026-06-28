import { Injectable } from '@angular/core';

export interface GradientDefinition {
  id: string;
  name: string;
  gradient: string;
  darkGradient?: string;
}

@Injectable({ providedIn: 'root' })
export class DesignSystemService {
  private readonly gradients: GradientDefinition[] = [
    {
      id: 'gradient-sunset',
      name: '🌅 Sunset',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FFA500 100%)',
      darkGradient: 'linear-gradient(135deg, #E63946 0%, #FF8C00 100%)',
    },
    {
      id: 'gradient-ocean',
      name: '🌊 Ocean',
      gradient: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
      darkGradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
    },
    {
      id: 'gradient-forest',
      name: '🌲 Forest',
      gradient: 'linear-gradient(135deg, #52C41A 0%, #389E0D 100%)',
      darkGradient: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
    },
    {
      id: 'gradient-purple',
      name: '💜 Purple',
      gradient: 'linear-gradient(135deg, #722ED1 0%, #531DAB 100%)',
      darkGradient: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
    },
    {
      id: 'gradient-pink',
      name: '💖 Pink',
      gradient: 'linear-gradient(135deg, #F5319D 0%, #D41159 100%)',
      darkGradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    },
    {
      id: 'gradient-cyan',
      name: '🌀 Cyan',
      gradient: 'linear-gradient(135deg, #13C2C2 0%, #0A8080 100%)',
      darkGradient: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
    },
    {
      id: 'gradient-gold',
      name: '✨ Gold',
      gradient: 'linear-gradient(135deg, #FAAD14 0%, #D48806 100%)',
      darkGradient: 'linear-gradient(135deg, #FBBF24 0%, #B45309 100%)',
    },
    {
      id: 'gradient-volcano',
      name: '🌋 Volcano',
      gradient: 'linear-gradient(135deg, #FF7A45 0%, #D3100C 100%)',
      darkGradient: 'linear-gradient(135deg, #FF6B35 0%, #A4161A 100%)',
    },
  ];

  private readonly emojiSets = {
    skills: ['💻', '⚙️', '🔧', '🛠️', '📚', '🧠', '⚡', '🚀'],
    interests: ['🎯', '🎨', '🎭', '🎮', '🎵', '📖', '✍️', '🔬'],
    languages: ['🗣️', '🌍', '📝', '💬', '🎓', '📚', '🔤', '🗨️'],
    social: ['🔗', '📱', '👥', '💼', '🌐', '📧', '💬', '🤝'],
    contact: ['📞', '✉️', '💬', '🔔', '📍', '⏰', '🔗', '📲'],
    work: ['💼', '🎯', '📊', '📈', '💡', '🏆', '🎓', '🚀'],
    hobbies: ['🎸', '⛷️', '🧗', '🏃', '🚴', '🎭', '🎨', '📸'],
    achievement: ['🏆', '⭐', '🥇', '🎖️', '👑', '💎', '🔥', '✅'],
  };

  getGradients(): GradientDefinition[] {
    return [...this.gradients];
  }

  getGradient(id: string): GradientDefinition | undefined {
    return this.gradients.find((g) => g.id === id);
  }

  getGradientCSS(id: string): string {
    const gradient = this.getGradient(id);
    return gradient?.gradient ?? this.gradients[0].gradient;
  }

  getEmojisByCategory(category: keyof typeof this.emojiSets): string[] {
    return [...(this.emojiSets[category] ?? [])];
  }

  getAllEmojis(): string[] {
    return Object.values(this.emojiSets).flat();
  }

  getCommonEmojis(): string[] {
    return ['💻', '🎯', '🔗', '⭐', '🚀', '💡', '🏆', '📚', '🎨', '🌟'];
  }
}
