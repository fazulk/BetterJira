import { computed, defineComponent } from 'vue'
import { getStatusLane, getStatusProgress, useStatusPreferences } from '@/composables/useStatusPreferences'

const center = 7
const outerRadius = 5
const pieRadius = 2.6

export default defineComponent({
  name: 'StatusIcon',
  props: {
    status: {
      type: String,
      required: true,
    },
    statusCategory: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 16,
    },
  },
  setup(props) {
    const { getStatusColor } = useStatusPreferences()

    const color = computed(() => getStatusColor(props.status, props.statusCategory))
    const lane = computed(() => getStatusLane(props.status, props.statusCategory))
    const progress = computed(() => getStatusProgress(props.status, props.statusCategory))

    const wedgePath = computed(() => {
      const sweep = Math.min(0.999, Math.max(0, progress.value))
      const endAngle = 360 * sweep
      const radians = (endAngle - 90) * (Math.PI / 180)
      const endX = center + pieRadius * Math.cos(radians)
      const endY = center + pieRadius * Math.sin(radians)
      const largeArc = endAngle > 180 ? 1 : 0
      return `M ${center} ${center} L ${center} ${center - pieRadius} A ${pieRadius} ${pieRadius} 0 ${largeArc} 1 ${endX} ${endY} Z`
    })

    return () => (
      <svg
        width={props.size}
        height={props.size}
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        class="shrink-0"
      >
        {lane.value === 'completed' && (
          <>
            <circle cx={center} cy={center} r={outerRadius} fill={color.value} />
            <path
              d="M4.6 7.1l1.7 1.7 3.1-3.4"
              fill="none"
              stroke="#0b0c0f"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </>
        )}

        {lane.value === 'triage' && (
          <>
            <circle cx={center} cy={center} r={outerRadius} fill="none" stroke={color.value} stroke-width="1.6" />
            <circle cx={center} cy={center} r="2" fill={color.value} />
          </>
        )}

        {lane.value === 'backlog' && (
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={color.value}
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-dasharray="0.01 2.3"
          />
        )}

        {lane.value === 'started' && (
          <>
            <circle cx={center} cy={center} r={outerRadius} fill="none" stroke={color.value} stroke-width="1.6" />
            <path d={wedgePath.value} fill={color.value} />
          </>
        )}

        {!['completed', 'triage', 'backlog', 'started'].includes(lane.value) && (
          <circle cx={center} cy={center} r={outerRadius} fill="none" stroke={color.value} stroke-width="1.6" />
        )}
      </svg>
    )
  },
})
