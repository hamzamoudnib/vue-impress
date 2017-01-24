import throttle from 'lodash/throttle'
import Step from '../Step'
import { translate, scale, rotate, transitionDuration, impressSupported } from '../../utils'
import initStepData from '../../utils/initStepData'
import reverseData from '../../utils/reverseData'
import computeScale from '../../utils/computeScale'

export default {
  props: {
    /* steps param array
     * 各动画的位置参数 */
    steps: {
      type: Array,
      required: true,
    },

    /* in fullscreen, only first viewport instance work, others are meaningless
     * 若全屏模式，则只有第一个viewport的实例可以正常工作，大概...
     * 全屏的话，第一个实例会占满窗口，就像impress.js的例子一样，他实例也没有意义 */
    fullscreen: Boolean,

    config: {
      type: Object,
    },

  },

  components: {
    Step,
  },

  methods: {
    nextStep() {
      const stepIndex = (this.stepIndex >= this.steps.length - 1) ?
        0 : this.stepIndex + 1
      this.gotoStep(stepIndex)
    },
    prevStep() {
      const stepIndex = this.stepIndex <= 0 ? this.steps.length - 1 : this.stepIndex - 1
      this.gotoStep(stepIndex)
    },

    gotoStep(stepIndex) {
      /* trigger when leave step, like impress.js
       * 当离开当前step时即触发，不用等下一个stepenter所以不用setTimeout
       * impress.js就是这么处理的，先这样 */
      if (stepIndex !== this.stepIndex) {
        this.stepLeave(this.stepIndex)
      }
      this.stepIndex = stepIndex
      const currentData = this.stepsData[stepIndex]
      const target = reverseData(currentData)
      const duration = currentData.transitionDuration || this.transitionDuration

      /* default perspective 1000px */

      const container = global
      const containerScale = computeScale(container, this.config)
      const perspective = `${(this.config.perspective || 1000) / containerScale}px`

      this.initialRootStyle = {
        /* perspective is for the elements in step which have transform css setting
         * if there are no transform elements, perspective is meaningless
         * 一开始没看出用处，后来发现perspective是给每个step里设置了transform的元素产生视角用的，若step中没有3d变换的元素是没什么用 */
        perspective,
        transitionDuration: duration,
        transform: scale(target.scale * containerScale),
      }
      this.canvasStyle = {
        transitionDuration: duration,
        transform: rotate(target.rotate, true) + translate(target.translate),
      }
      /* when switch steps too quickly,
       * only after the duration time between steps, trigger `impress:stepenter` event
       * 当快速切换step时，超过duration时间之后的step才触发impress:stepenter */
      clearTimeout(this.stepEnterTimeout)
      this.stepEnterTimeout = setTimeout(() => {
        this.stepEnter()
      }, transitionDuration(duration, true))
    },

    stepEnter() {
      this.$emit('impress:stepenter', this.stepIndex)
    },
    stepLeave(index) {
      this.$emit('impress:stepleave', index)
    },
  },

  beforeMount() {
    this.impressSupported = impressSupported
    this.stepsData = this.steps.map((data) => {
      const stepData = initStepData(data)
      stepData.content = data.content
      return stepData
    })
    this.transitionDuration = transitionDuration(this.config.transitionDuration || 1000)
  },

  mounted() {
    // const parent = this.$refs.root.offsetParent
    this.gotoStep(0)

    this.$on('impress:goto', (index) => {
      this.gotoStep(index)
    })

    this.resize = throttle(() => {
      this.gotoStep(this.stepIndex)
    }, 250)

    if (this.config.fullscreen) {
      window.addEventListener('resize', this.resize)
    }
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.resize)
  },

  data() {
    return {
      impressSupported: true,
      initialRootStyle: null,
      canvasStyle: null,
      stepIndex: null,
      lastStepIndex: null,
      stepsData: [],
      transitionDuration: '',
      /* for throttle impress:stepenter event in steps duration time
       * 给每个step enter之后的timeout用 */
      stepEnterTimeout: null,
    }
  },
}
