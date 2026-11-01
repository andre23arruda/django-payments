// @ts-check
/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos
    'type-enum': [
      2,
      'always',
      [
        'feat',     // nova funcionalidade
        'fix',      // correção de bug
        'docs',     // apenas documentação
        'style',    // formatação, ponto e vírgula, etc (sem mudança de lógica)
        'refactor', // refatoração de código
        'perf',     // melhoria de performance
        'test',     // adição ou correção de testes
        'build',    // mudanças no build system ou dependências externas
        'ci',       // mudanças nos arquivos de CI/CD
        'chore',    // tarefas de manutenção, sem mudança de código de produção
        'revert',   // reverter um commit anterior
      ],
    ],
    // Máximo de 72 chars no subject
    'header-max-length': [2, 'always', 72],
    // Subject não pode terminar com ponto
    'subject-full-stop': [2, 'never', '.'],
    // Subject não pode estar vazio
    'subject-empty': [2, 'never'],
    // Tipo não pode estar vazio
    'type-empty': [2, 'never'],
    // Tipo deve ser lower-case
    'type-case': [2, 'always', 'lower-case'],
    // Subject deve ser lower-case (desativado para aceitar nomes próprios e português)
    'subject-case': [0],
  },
};
