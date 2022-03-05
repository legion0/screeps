class VOE<T> {
  fromValue(value: T) {
    this.initialized_ = true;
    this.hasValue_ = true;
    this.value_ = value;
    return this;
  }
  fromError(error: ScreepsReturnCode) {
    this.initialized_ = true;
    this.hasValue_ = false;
    this.error_ = error;
    return this;
  }

  hasValue() {
    if (!this.initialized_) {
      throw new Error('ValueOrError is not initialized');
    }
    return this.hasValue_;
  }

  getValue() {
    if (!this.initialized_) {
      throw new Error('ValueOrError is not initialized');
    } else if (!this.hasValue_) {
      throw new Error('ValueOrError has error, no value');
    }
    return this.value_;
  }

  getError() {
    if (!this.initialized_) {
      throw new Error('ValueOrError is not initialized');
    } else if (this.hasValue_) {
      throw new Error('ValueOrError has value, not error');
    }
    return this.error_;
  }

  private value_: T;
  private error_: ScreepsReturnCode;
  private initialized_: boolean;
  private hasValue_: boolean;
}
