    // Light panels on top rows（上方帶狀）
    for (let x = 2; x <= 136; x += 7) this.layer.putTileAt(LIGHT, x, 1);
    // Doors created above

    // 中央大廳視覺安檢線（僅視覺，不設碰撞）
    const hubX2 = this.hubX;
    for (let y = Math.floor(map.height / 2) - 1; y <= Math.floor(map.height / 2) + 1; y++) this.layer.putTileAt(STRIPE, hubX2, y);
    // Collisions with borders/facade
    this.layer.setCollision([BORDER, FACADE], true);

    // Location status via global UIOverlay (right-top)
    this.registry.set('location', t('concourse.sign'));
    this.registry.set('locationType', 'concourse');

    // Player
    const idleKey = this.textures.exists('player_idle') ? 'player_idle' : 'sprite-player';
    const ps = this.add.sprite(0, 0, idleKey, 0).setOrigin(0.5, 1).setDepth(100);
    this.physics.add.existing(ps);
    this.player = ps as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.player.body.setCollideWorldBounds(true);
    // 32x32 幀中，實際角色 16x16，腳底碰撞盒縮小貼地
    try {
      const frame: any = (ps as any).frame;
      const fw = Math.max(1, Number(frame?.width ?? 32));
      const fh = Math.max(1, Number(frame?.height ?? 32));
      const bw = Math.max(6, Math.round(fw * 0.35));
      const bh = Math.max(4, Math.round(fh * 0.25));
      const offX = Math.round((fw - bw) / 2);
      const offY = Math.round(fh - bh - fh * 0.06);
      (this.player.body as any).setSize(bw, bh).setOffset(offX, offY);
    } catch {}
    // 主人公出生在大廳正中央
    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Collide with walls
    this.physics.add.collider(this.player, this.layer);

    // Crowd NPCs（從名單隨機抽人；僅在中央豎向走道活動）
    fetchTravelers().then((list) => {
      const pool = list.slice();
      const pick = (n: number) => { const out: any[] = []; for (let i=0;i<n && pool.length;i++){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out; };
      const chosen = pick(8);
      this.crowd = createCrowd(this, {
        count: chosen.length,
        // 中央豎向走道範圍：以 hubX 為中心，寬約 3 格，貫通 A/B 之間（擴高後）
        area: { xMin: this.hubX * 16 - 24, xMax: this.hubX * 16 + 24, yMin: 4 * 16, yMax: 18 * 16 },
        texture: 'sprite-npc',
        tint: 0xffffff,
        layer: this.layer,
        collideWith: [this.player as unknown as any],
        speed: { vx: [-40, 40], vy: [-10, 10] },
        bounce: { x: 1, y: 1 },
        travelers: chosen,
        texturesByGender: { default: 'sprite-npc' },
      });
    });

    // 初始提示交由全域 UIOverlay 顯示
    this.registry.set('hint', `${t('concourse.hintMoveEnter')}｜ESC 購物籃`);

    // 物理世界使用設計解析度，覆蓋整張地圖高度
    this.physics.world.setBounds(0, 0, map.width * 16, map.height * 16);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(this.player, true, 1, 1, 0, 0);
    // 重新套用全域相機縮放於喚醒/恢復時
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} this.registry.set('location', t('concourse.sign')); this.registry.set('locationType', 'concourse'); });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} this.registry.set('location', t('concourse.sign')); this.registry.set('locationType', 'concourse'); });
  }

  private spawnCrowd() {
    const group = this.physics.add.group(); // kept stub to preserve method structure
    this.crowd = this.crowd ?? group;
  }

  private ensureDoorIcons() {
    const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, 12, 12);
      g.destroy();
    };
    // Cosmetics: lipstick
    make('icon-cosmetics', (g) => {
      g.fillStyle(0xff6fae, 1); g.fillRect(6, 2, 2, 5);
      g.fillStyle(0x333333, 1); g.fillRect(5, 7, 4, 3);
    });
    // Liquor: bottle
    make('icon-liquor', (g) => {
      g.fillStyle(0x2e8b57, 1); g.fillRect(4, 3, 4, 6);
      g.fillStyle(0xcce8ff, 1); g.fillRect(5, 2, 2, 1);
    });
    // Snacks: box
    make('icon-snacks', (g) => {
      g.fillStyle(0xf4b183, 1); g.fillRect(3, 4, 6, 5);
      g.fillStyle(0xc55a11, 1); g.fillRect(3, 3, 6, 1);
    });
    // Tobacco: cigar
    make('icon-tobacco', (g) => {
      g.fillStyle(0x8d6e63, 1); g.fillRect(3, 5, 6, 2);
      g.fillStyle(0xff7043, 1); g.fillRect(8, 5, 1, 2);
    });
    // Perfume: bottle
    make('icon-perfume', (g) => {
      g.fillStyle(0x6fa8dc, 1); g.fillRect(4, 4, 4, 5);
      g.fillStyle(0x674ea7, 1); g.fillRect(5, 2, 2, 2);
    });
  }

  update(_time: number, delta: number) {
    const spr = this.player as unknown as Phaser.GameObjects.Sprite;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    const baseSpeed = CONFIG.controls.baseSpeed;
    const runMul = CONFIG.controls.runMultiplier;
    const speed = (this.keys as any).SHIFT?.isDown ? Math.round(baseSpeed * runMul) : baseSpeed;
    if (this.cursors.left?.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || this.keys.D.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || this.keys.S.isDown) body.setVelocityY(speed);
    // 動畫播放（方向）：down/up/side，side 以 flipX 控左右
    try {
      const moving = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) > 0;
      const ax = body.velocity.x; const ay = body.velocity.y;
      const absx = Math.abs(ax), absy = Math.abs(ay);
      let facing: 'down' | 'up' | 'side' = (spr.getData('facing') as any) || 'down';
      let flipX = spr.flipX;
      if (moving) {
        if (absx >= absy) { facing = 'side'; flipX = ax < 0; }
        else { facing = ay < 0 ? 'up' : 'down'; }
        spr.setData('facing', facing);
        spr.setFlipX(facing === 'side' ? flipX : false);
        const key = this.anims.exists(`player-walk-${facing}`) ? `player-walk-${facing}` : undefined;
        if (key) (spr as any).anims.play(key, true); else (spr as any).anims.stop();
      } else {
        const key = this.anims.exists(`player-idle-${facing}`) ? `player-idle-${facing}` : undefined;
        spr.setFlipX(facing === 'side' ? flipX : false);
        if (key) (spr as any).anims.play(key, true); else (spr as any).anims.stop();
      }
    } catch {}
    updateCrowd(this, this.crowd);
    // 縮短名牌觸發距離，需更接近才顯示
    updateNameplates(this, this.crowd, this.player as any, 22);

    // Door interaction (multiple stores) + 名牌顯示（靠近才顯示）
    let nearest: { world: Phaser.Math.Vector2; id: string; label: string } | null = null;
    let nd = Number.POSITIVE_INFINITY;
    for (const d of this.doors) {
      const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.world.x, d.world.y);
      if (dd < nd) { nd = dd; nearest = d; }
    }
    // 顯示最近門的名牌（距離閾值內）
    const showDist = 22;
    const zoom = Math.max(0.0001, this.cameras.main.zoom || 1);
    const fsWorld = Math.max(8, Math.round(CONFIG.ui.fontSize / zoom));
    for (const d of this.doors) {
      let lbl = this.doorLabels.get(d.id);
      if (!lbl) {
        lbl = this.add.text(d.world.x, d.world.y - (fsWorld + 6), d.label, {
          fontSize: `${fsWorld}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif'
        }).setOrigin(0.5, 1).setDepth(12).setVisible(false)
          .setStroke('#ffffff', 2);
        this.doorLabels.set(d.id, lbl);
      }
      // 僅顯示最近且在距離內的門名牌
      if (nearest && d.id === nearest.id && nd < showDist) {
        if ((lbl.style.fontSize as any) !== `${fsWorld}px`) lbl.setFontSize(fsWorld);
        try { lbl.setStroke('#ffffff', 2); } catch {}
        lbl.setPosition(d.world.x, d.world.y - (fsWorld + 6)).setText(d.label).setVisible(true);
      } else {
        lbl.setVisible(false);
      }
    }
    // 根據玩家位置更新地點（A 區 / 大廳 / B 區），以 y 軸判定
    const py = this.player.y;
    let zone = '大廳'; let ltype = 'concourse';
    if (py <= 3 * 16 + 8) { zone = 'A 區'; ltype = 'concourse-A'; }
    else if (py >= 19 * 16 - 8) { zone = 'B 區'; ltype = 'concourse-B'; }
    this.registry.set('location', zone);
    this.registry.set('locationType', ltype);

    if (nearest && nd < 18) {
      this.registry.set('hint', `${nearest.label}｜${t('concourse.hintEnter')}｜ESC 購物籃`);
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.scene.pause();
        this.scene.launch('StoreScene', { storeId: nearest.id });
      }
      return;
    } else {
      this.registry.set('hint', `${t('concourse.hintMoveEnter')}｜ESC 購物籃`);
      return;
    }
  }
}





