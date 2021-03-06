function PlayerRespawnedEvent(playerId, x, y, health) {
  this.playerId = playerId;
  this.x = x;
  this.y = y;
  this.health = health;
}

module.exports.PlayerRespawnedEvent = PlayerRespawnedEvent;

function EntityTookDamageEvent(entityId, attackerId, dmg, dmgType) {
  this.entityId = entityId; // id of entity that took damage
  this.attackerId = attackerId; // id of attacking entity (or null)
  this.dmg = dmg; // int amount of damage

  dmgType = (dmgType in EntityTookDamageEvent.EnumDamageTypes) ? dmgType : EntityTookDamageEvent.EnumDamageTypes.DEFAULT;
  this.dmgType = dmgType; // string type of damage
}

EntityTookDamageEvent.EnumDamageTypes = {
  DEFAULT: "DEFAULT",
  REVOLVER: "REVOLVER",
  NAILGUN: "NAILGUN",
  UZI: "UZI",
  KATANA: "KATANA",
};

// make a pool to reuse useful events
EntityTookDamageEvent._eventPool = {};
for (var key in EntityTookDamageEvent.EnumDamageTypes) {
  EntityTookDamageEvent._eventPool[key] = [];
}

EntityTookDamageEvent.prototype.returnToPool = function() {
  if (this.dmgType in EntityTookDamageEvent._eventPool) {
    this.attackerId = null;
    this.entityId = null;
    EntityTookDamageEvent._eventPool[this.dmgType].push(this);
  } else {
    throw new Error(`Given damage type ${this.dmgType} not in damage event pool`);
  }
};

EntityTookDamageEvent.fromBullet = function(bullet, targetEntity) {
  var e = null;
  if (bullet.bulletType in EntityTookDamageEvent._eventPool) {
    e = EntityTookDamageEvent._eventPool[bullet.bulletType].pop()
      || new EntityTookDamageEvent(targetEntity.id, bullet.shooterId, 1, bullet.bulletType);
  } else {
    e = new EntityTookDamageEvent(targetEntity.id, bullet.shooterId, 1, bullet.bulletType);
  }
  return e;
};
EntityTookDamageEvent.fromKatanaAttack = function(katanaAttack, targetEntity) {
  var e = null;
  var dmgType = EntityTookDamageEvent.EnumDamageTypes.KATANA;
  if (dmgType in EntityTookDamageEvent._eventPool) {
    e = EntityTookDamageEvent._eventPool[dmgType].pop()
      || new EntityTookDamageEvent(targetEntity.id, katanaAttack.shooterId, 1, dmgType);
  } else {
    e = new EntityTookDamageEvent(targetEntity.id, katanaAttack.shooterId, 1, dmgType);
  }
  return e;
};

module.exports.EntityTookDamageEvent = EntityTookDamageEvent;
