import { defineComponent, h } from 'vue'

export const Icon = defineComponent({
  name: 'NuxtIconStub',
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs }) {
    return () => h('i', { ...attrs, 'data-test-id': 'nuxt-icon', 'data-name': props.name })
  },
})
