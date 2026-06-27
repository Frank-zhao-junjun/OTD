// components/view-switch/view-switch.js
Component({
  properties: {
    mode: {
      type: String,
      value: 'card'
    }
  },

  methods: {
    onSwitch(e) {
      const mode = e.currentTarget.dataset.mode;
      if (mode === this.data.mode) return;
      this.triggerEvent('change', { mode });
    }
  }
});
