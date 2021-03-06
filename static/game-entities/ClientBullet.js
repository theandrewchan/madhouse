var EnumBulletTypes = {
  DEFAULT: 0,
  REVOLVER: 1,
  NAILGUN: 2,
};
var lastLocalBulletId = 0;

function BulletSnapshot(
  alive,
  bulletType,
  x,
  y,
  velocityX,
  velocityY,
  shooterId,
  localBulletId
) {
  this.alive = alive;
  this.bulletType = bulletType; // enum bullet type
  this.x = x;
  this.y = y;
  this.velocity = {
    x: velocityX,
    y: velocityY,
  };

  this.shooterId = shooterId;
  this.localBulletId = localBulletId;
}

// ALL bullets should inherit from this class.

function ClientBullet(shooterId, game, x, y) {
  Phaser.Bullet.call(this, game, x, y, "particle_sm", 0);
  this.bulletType = EnumBulletTypes.DEFAULT;
  this.alive = true; // set to FALSE when hits an enemy, etc.

  // id of player or (server-def) entity that shot the bullet
  this.shooterId = shooterId;
  // ID of the bullet on the client that created the bullet.
  // this is NOT guaranteed to be unique.
  // however, the combo (shooterId, localBulletId) should always be unique.
  this.localBulletId = lastLocalBulletId++;

  game.physics.arcade.enable(this);
  this.body.setSize( 6, 6, 0, 0 );
  this.body.tilePadding.set( 12, 12 );

  // if the object has recently been changed and needs to sync w/ server
  this.isDirty = false;

  this.snapshot = new BulletSnapshot(
    this.alive,
    this.bulletType,
    this.x,
    this.y,
    this.body.velocity.x,
    this.body.velocity.y,
    this.shooterId,
    this.localBulletId,
  );
}
ClientBullet.prototype = Object.create(Phaser.Bullet.prototype);
ClientBullet.prototype.constructor = ClientBullet;

//@static
// Use this instead of the constructor for bullets originating from other clients,
// in order to set the localBulletId correctly.
ClientBullet.fromSnapshot = function(bulletSnapshot) {
  var constructorFunc = ({
    [EnumBulletTypes.DEFAULT]: ClientBullet,
    [EnumBulletTypes.REVOLVER]: RevolverBullet,
    [EnumBulletTypes.NAILGUN]: RevolverBullet,
  })[bulletSnapshot.bulletType];
  var bullet = new constructorFunc(bulletSnapshot.shooterId, game, 0, 0);
  bullet.localBulletId = bulletSnapshot.localBulletId;

  // bullets created from snapshots do not have associated weapons.
  // here's a disgusting hack to make this not break everything
  bullet.data.bulletManager = {
    onKill: {
      dispatch: function() {}
    },
    bulletBounds: game.world.bounds,
    bulletWorldWrap: false,
  };

  bullet.syncWithSnapshot(bulletSnapshot);
  bullet.isDirty = false;
  return bullet;
};

ClientBullet.prototype.kill = function() {
  this.isDirty = true;
  this.alive = false;
  return Phaser.Bullet.prototype.kill.call(this);
};

ClientBullet.prototype.impact = function() {
  // override
  return;
};

ClientBullet.prototype.getSnapshot = function() {
  this.isDirty = false;

  this.snapshot.alive = this.alive;
  this.snapshot.bulletType = this.bulletType;
  this.snapshot.x = this.x;
  this.snapshot.y = this.y;
  this.snapshot.velocity.x = this.body.velocity.x;
  this.snapshot.velocity.y = this.body.velocity.y;

  return this.snapshot;
};

ClientBullet.prototype.syncWithSnapshot = function(bulletSnapshot) {
  if (this.alive !== bulletSnapshot.alive) {
    this.alive = bulletSnapshot.alive;
    if (this.alive === false) this.impact();
  }

  this.bulletType = bulletSnapshot.bulletType;
  this.x = bulletSnapshot.x;
  this.y = bulletSnapshot.y;
  this.body.velocity.x = bulletSnapshot.velocity.x;
  this.body.velocity.y = bulletSnapshot.velocity.y;
};

ClientBullet.prototype.reset = function(x, y, health) {
  // this is called when the bullet is fired.
  Phaser.Bullet.prototype.reset.call(this, x, y, health);
  this.isDirty = true;
};
