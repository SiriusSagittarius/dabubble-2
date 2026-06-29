import { Component, EventEmitter, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarCaretIconComponent } from './sidebar-caret-icon.component';
import { SidebarDmListItemComponent } from './sidebar-dm-list-item.component';
import { SidebarChannelSublistComponent } from './sidebar-channel-sublist.component';
import { SidebarDevspaceSearchComponent } from './sidebar-devspace-search.component';
import { SidebarDeleteAccountComponent } from './sidebar-delete-account.component';
import { SidebarHelpButtonComponent } from './sidebar-help-button.component';
import { SidebarLegalLinksComponent } from './sidebar-legal-links.component';
import { SidebarContactsBase } from './sidebar.contacts.base';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarCaretIconComponent, SidebarDmListItemComponent, SidebarChannelSublistComponent, SidebarDevspaceSearchComponent, SidebarDeleteAccountComponent, SidebarHelpButtonComponent, SidebarLegalLinksComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: [
    './sidebar.channels.scss',
    './sidebar.channels-2.scss',
    './sidebar.dm.scss',
    './sidebar.kontakte.scss',
    './sidebar.kontakte-2.scss',
    './sidebar.danger.scss',
  ],
})
export class Sidebar extends SidebarContactsBase {
  @Output() itemSelected = new EventEmitter<void>();

  protected emitItemSelected(): void {
    this.itemSelected.emit();
  }

  protected readonly channelsExpanded = signal(true);
  protected readonly directMessagesExpanded = signal(false);

  protected readonly alleChannelsExpanded = signal(false);
  protected readonly subscribedChannelsExpanded = signal(false);
  protected readonly ownChannelsExpanded = signal(true);

  protected readonly subscribedPublicExpanded = signal(true);
  protected readonly subscribedPrivateExpanded = signal(false);
  protected readonly ownPublicExpanded = signal(true);
  protected readonly ownPrivateExpanded = signal(false);
  protected readonly devspaceSearchOpen = signal(false);
  protected readonly devspaceSearchQuery = signal('');

  protected readonly searchShowChannels = computed(() =>
    this.devspaceSearchQuery().startsWith('#')
  );
  protected readonly searchShowUsers = computed(() =>
    this.devspaceSearchQuery().startsWith('@')
  );
  protected readonly searchShowDefault = computed(() =>
    !this.searchShowChannels() && !this.searchShowUsers()
  );

  protected readonly filteredChannels = computed(() => {
    const q = this.devspaceSearchQuery().slice(1).toLowerCase();
    return this.database.joinedChannels().filter(c =>
      !q || c.name.toLowerCase().includes(q)
    );
  });

  protected readonly filteredUsers = computed(() => {
    const q = this.devspaceSearchQuery().slice(1).toLowerCase();
    const currentUserId = this.database.currentUser()?.id;
    const memberIds = this._channelMemberIds();
    return this.database.users().filter(u => {
      if (u.id === currentUserId) return false;
      return memberIds.has(u.id) && (!q || u.name.toLowerCase().includes(q));
    });
  });

  protected readonly joinedChannelIds = computed(() =>
    new Set(this.database.joinedChannels().map(c => c.id))
  );

  private readonly _ownChannels = computed(() => {
    const userId = this.database.currentUser()?.id;
    if (!userId) return [];
    return this.database.joinedChannels().filter(c => c.createdBy === userId);
  });

  protected readonly ownPublicChannels = computed(() =>
    this._ownChannels().filter(c => !c.isPrivate)
  );

  protected readonly ownPrivateChannels = computed(() =>
    this._ownChannels().filter(c => c.isPrivate)
  );

  private readonly _subscribedChannels = computed(() => {
    const userId = this.database.currentUser()?.id;
    if (!userId) return [];
    return this.database.joinedChannels().filter(c => c.createdBy !== userId);
  });

  protected readonly subscribedPublicChannels = computed(() =>
    this._subscribedChannels().filter(c => !c.isPrivate)
  );

  protected readonly subscribedPrivateChannels = computed(() =>
    this._subscribedChannels().filter(c => c.isPrivate)
  );

  protected readonly directMessageList = computed(() => {
    const partners = this.database.directMessagePartners();
    const openId = this.uiState.selectedDirectMessageUserId();
    if (!openId || partners.some((u) => u.id === openId)) {
      return partners;
    }
    const openUser = this.database.findUser(openId);
    return openUser ? [openUser, ...partners] : partners;
  });

  protected channelIsActive(channelId: string): boolean {
    return this.database.selectedChannelId() === channelId;
  }

  protected isOwnChannel(channel: { createdBy: string }): boolean {
    return channel.createdBy === this.database.currentUser()?.id;
  }

  protected toggleChannels(): void {
    const next = !this.channelsExpanded();
    this.directMessagesExpanded.set(false);
    this.kontakteExpanded.set(false);
    this.channelsExpanded.set(next);
  }

  protected toggleDirectMessages(): void {
    const next = !this.directMessagesExpanded();
    this.channelsExpanded.set(false);
    this.kontakteExpanded.set(false);
    this.directMessagesExpanded.set(next);
  }

  protected toggleKontakte(): void {
    const next = !this.kontakteExpanded();
    this.channelsExpanded.set(false);
    this.directMessagesExpanded.set(false);
    this.kontakteExpanded.set(next);
  }

  protected toggleAlleChannels(): void {
    const next = !this.alleChannelsExpanded();
    this.subscribedChannelsExpanded.set(false);
    this.ownChannelsExpanded.set(false);
    this.alleChannelsExpanded.set(next);
  }

  protected toggleSubscribedChannels(): void {
    const next = !this.subscribedChannelsExpanded();
    this.alleChannelsExpanded.set(false);
    this.ownChannelsExpanded.set(false);
    this.subscribedChannelsExpanded.set(next);
  }

  protected toggleOwnChannels(): void {
    const next = !this.ownChannelsExpanded();
    this.alleChannelsExpanded.set(false);
    this.subscribedChannelsExpanded.set(false);
    this.ownChannelsExpanded.set(next);
  }

  protected toggleSubscribedPublic(): void {
    const next = !this.subscribedPublicExpanded();
    this.subscribedPrivateExpanded.set(false);
    this.subscribedPublicExpanded.set(next);
  }

  protected toggleSubscribedPrivate(): void {
    const next = !this.subscribedPrivateExpanded();
    this.subscribedPublicExpanded.set(false);
    this.subscribedPrivateExpanded.set(next);
  }

  protected toggleOwnPublic(): void {
    const next = !this.ownPublicExpanded();
    this.ownPrivateExpanded.set(false);
    this.ownPublicExpanded.set(next);
  }

  protected toggleOwnPrivate(): void {
    const next = !this.ownPrivateExpanded();
    this.ownPublicExpanded.set(false);
    this.ownPrivateExpanded.set(next);
  }

  protected openDevspaceSearch(): void {
    this.devspaceSearchOpen.set(true);
  }

  protected closeDevspaceSearch(): void {
    this.devspaceSearchOpen.set(false);
    this.devspaceSearchQuery.set('');
  }

  protected openMainChatIntro(): void {
    this.uiState.openMainChatIntro();
    this.itemSelected.emit();
  }

  protected openAddChannelDialog(): void {
    this.uiState.openAddChannelDialog();
  }

  protected openAddMembersPanel(): void {
    this.uiState.openAddMembersPanel();
  }

  protected openDirectMessage(userId: string): void {
    this.uiState.openDirectMessage(userId);
    this.itemSelected.emit();
  }

  protected onSelectChannel(channelId: string): void {
    this.database.selectChannel(channelId);
    this.uiState.openChannel();
    this.itemSelected.emit();
  }

  protected joinChannel(channelId: string): void {
    this.database.joinChannel(channelId);
    this.onSelectChannel(channelId);
  }

  protected leaveChannel(channelId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.database.leaveChannel(channelId);
  }
}
