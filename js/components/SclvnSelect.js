export default {
    name: 'SclvnSelect',

    props: {
        modelValue: {
            type: [String, Number],
            default: '',
        },

        options: {
            type: Array,
            default: () => [],
        },

        placeholder: {
            type: String,
            default: 'Select an option',
        },

        searchable: {
            type: Boolean,
            default: false,
        },

        searchPlaceholder: {
            type: String,
            default: 'Search...',
        },

        disabled: {
            type: Boolean,
            default: false,
        },
    },

    emits: ['update:modelValue', 'change'],

    data: () => ({
        open: false,
        query: '',
    }),

    computed: {
        normalizedOptions() {
            return this.options.map(option => {
                if (
                    option &&
                    typeof option === 'object' &&
                    !Array.isArray(option)
                ) {
                    return {
                        value:
                            option.value ??
                            option.label ??
                            '',
                        label:
                            option.label ??
                            String(option.value ?? ''),
                        hint:
                            option.hint ??
                            '',
                    };
                }

                return {
                    value: option,
                    label: String(option),
                    hint: '',
                };
            });
        },

        selectedOption() {
            return (
                this.normalizedOptions.find(
                    option =>
                        String(option.value) ===
                        String(this.modelValue)
                ) || null
            );
        },

        filteredOptions() {
            const query = this.query.trim().toLowerCase();

            if (!query) {
                return this.normalizedOptions;
            }

            return this.normalizedOptions.filter(option =>
                option.label.toLowerCase().includes(query) ||
                String(option.value).toLowerCase().includes(query) ||
                String(option.hint || '').toLowerCase().includes(query)
            );
        },
    },

    mounted() {
        document.addEventListener('click', this.handleOutsideClick);
    },

    beforeUnmount() {
        document.removeEventListener('click', this.handleOutsideClick);
    },

    methods: {
        toggle() {
            if (this.disabled) return;

            this.open = !this.open;

            if (!this.open) {
                this.query = '';
            }
        },

        close() {
            this.open = false;
            this.query = '';
        },

        select(option) {
            this.$emit('update:modelValue', option.value);
            this.$emit('change', option.value);
            this.close();
        },

        handleOutsideClick(event) {
            if (
                this.open &&
                this.$el &&
                !this.$el.contains(event.target)
            ) {
                this.close();
            }
        },
    },

    template: `
        <div
            class="sclvn-picker"
            :class="{ 'is-open': open, 'is-disabled': disabled }"
            @click.stop
        >
            <button
                class="sclvn-picker-trigger"
                type="button"
                :disabled="disabled"
                @click="toggle"
            >
                <span
                    class="sclvn-picker-trigger-text"
                    :class="{ 'is-placeholder': !selectedOption }"
                >
                    {{ selectedOption ? selectedOption.label : placeholder }}
                </span>

                <svg
                    class="sclvn-picker-chevron"
                    :class="{ 'is-open': open }"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="m7 10 5 5 5-5"></path>
                </svg>
            </button>

            <div
                v-if="open"
                class="sclvn-picker-dropdown"
            >
                <div
                    v-if="searchable"
                    class="sclvn-picker-search"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="6"></circle>
                        <path d="m16 16 4 4"></path>
                    </svg>

                    <input
                        v-model="query"
                        type="search"
                        autocomplete="off"
                        :placeholder="searchPlaceholder"
                        @keydown.esc="close"
                    >
                </div>

                <div class="sclvn-picker-options">
                    <button
                        v-for="option in filteredOptions"
                        :key="String(option.value)"
                        class="sclvn-picker-option"
                        :class="{
                            'is-selected':
                                String(option.value) ===
                                String(modelValue)
                        }"
                        type="button"
                        @click="select(option)"
                    >
                        <span>
                            <strong>{{ option.label }}</strong>
                            <small v-if="option.hint">{{ option.hint }}</small>
                        </span>

                        <svg
                            v-if="
                                String(option.value) ===
                                String(modelValue)
                            "
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="m5 12 4 4L19 6"></path>
                        </svg>
                    </button>

                    <div
                        v-if="filteredOptions.length === 0"
                        class="sclvn-picker-empty"
                    >
                        No options found.
                    </div>
                </div>
            </div>
        </div>
    `,
};
