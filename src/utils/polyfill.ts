function polyfill() {
  if (!Map.prototype.getOrInsert) {
    Map.prototype.getOrInsert = function <K, V>(
      this: Map<K, V>,
      key: K,
      value: V,
    ): V {
      if (!this.has(key)) {
        this.set(key, value);
      }
      return this.get(key)!;
    };
  }

  if (!Map.prototype.getOrInsertComputed) {
    Map.prototype.getOrInsertComputed = function <K, V>(
      this: Map<K, V>,
      key: K,
      computeValue: (key: K) => V,
    ): V {
      if (!this.has(key)) {
        this.set(key, computeValue(key));
      }
      return this.get(key)!;
    };
  }
}

polyfill();
